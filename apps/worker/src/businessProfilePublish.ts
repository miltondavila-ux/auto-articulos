import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getGoogleAccessToken,
  createLocalPost,
} from "@auto-articulos/shared";
import { put } from "@vercel/blob";
import { buildImagePrompt } from "./imagePrompt";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";

// Límite real y documentado de Google para el campo "summary" de una
// publicación de Business Profile — pedido explícito del usuario, 5/8/2026
// (corregido en la misma conversación: no son 100 caracteres, son más de
// 1000; 1500 es el límite práctico que usa Google en su propia interfaz).
const MAX_GBP_SUMMARY_LEN = 1500;

/**
 * Pide a la IA una versión corta y adaptada del resumen del artículo,
 * pensada para Google Business Profile (tono más directo, invita a hacer
 * clic) en vez de simplemente recortar el excerpt original.
 */
async function buildBusinessProfileSummary(
  finalTitle: string,
  summary: string,
): Promise<string> {
  if (!OPENAI_API_KEY) return summary.slice(0, MAX_GBP_SUMMARY_LEN);
  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content:
              `Adapta este artículo a una publicación corta para Google Business Profile, en español, tono cercano y directo, que invite a hacer clic para leer más. Máximo ${MAX_GBP_SUMMARY_LEN} caracteres, sin hashtags ni markdown, solo texto plano.\n\n` +
              `Título: ${finalTitle}\nResumen del artículo: ${summary}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 400,
      }),
    });
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!response.ok || !text) return summary.slice(0, MAX_GBP_SUMMARY_LEN);
    return text.slice(0, MAX_GBP_SUMMARY_LEN);
  } catch {
    return summary.slice(0, MAX_GBP_SUMMARY_LEN);
  }
}

/**
 * Genera la imagen con OpenAI usando EL MISMO prompt que se usa para pedirle
 * la imagen a 10minutesWebsite (buildImagePrompt) — pedido explícito del
 * usuario, 5/8/2026 — y la sube a Vercel Blob para tener una URL pública que
 * Google pueda descargar (localPosts.media solo acepta una URL, no bytes).
 */
async function generateAndHostImage(
  titleId: string,
  summary: string,
): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  const prompt = buildImagePrompt(summary);
  const response = await fetch(OPENAI_IMAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      n: 1,
    }),
  });
  const data = (await response.json()) as {
    data?: { b64_json?: string }[];
    error?: { message?: string };
  };
  const b64 = data.data?.[0]?.b64_json;
  if (!response.ok || !b64) {
    throw new Error(
      data.error?.message ?? "OpenAI no pudo generar la imagen para Google Business Profile.",
    );
  }
  const buffer = Buffer.from(b64, "base64");
  const blob = await put(`business-profile/${titleId}.png`, buffer, {
    access: "public",
    contentType: "image/png",
  });
  return blob.url;
}

/**
 * Procesa UNA publicación pendiente de enviar a Google Business Profile.
 * Devuelve true si hizo algo. Se "reserva" el título creando primero el
 * registro BusinessProfilePost (titleId es único): si otro proceso ya lo
 * creó, la creación falla y este lane simplemente no hizo nada — no hace
 * falta el mismo bloqueo por usuario que usa queue.ts, porque esto no abre
 * ninguna sesión de Playwright contra 10minutesWebsite.
 */
export async function processNextBusinessProfilePost(): Promise<boolean> {
  const candidate = await prisma.title.findFirst({
    where: {
      status: "success",
      articleUrl: { not: null },
      summary: { not: null },
      businessProfilePost: null,
      run: {
        user: {
          businessProfileIntegration: { locationName: { not: null } },
        },
      },
    },
    orderBy: { processedAt: "asc" },
    include: {
      run: {
        select: {
          userId: true,
          user: { select: { businessProfileIntegration: true } },
        },
      },
    },
  });
  if (!candidate) return false;

  const integration = candidate.run.user.businessProfileIntegration;
  if (!integration?.locationName) return false;

  let post;
  try {
    post = await prisma.businessProfilePost.create({
      data: {
        titleId: candidate.id,
        summary: "",
        ctaUrl: candidate.articleUrl ?? "",
        status: "pending",
      },
    });
  } catch {
    // Otro proceso ya lo tomó (violación de unicidad en titleId).
    return true;
  }

  try {
    const finalTitle = candidate.finalTitle ?? candidate.text;
    const summary = candidate.summary ?? "";
    const gbpSummary = await buildBusinessProfileSummary(finalTitle, summary);
    const imageUrl = await generateAndHostImage(candidate.id, summary).catch(
      () => null,
    );

    const accessToken = await getGoogleAccessToken(
      decryptSecret(integration.encryptedRefreshToken),
    );
    const result = await createLocalPost(accessToken, integration.locationName, {
      summary: gbpSummary,
      ctaUrl: candidate.articleUrl ?? "",
      imageUrl: imageUrl ?? undefined,
    });

    const rejected = result.state === "REJECTED";
    await prisma.businessProfilePost.update({
      where: { id: post.id },
      data: {
        summary: gbpSummary,
        imageUrl,
        status: rejected ? "rejected" : "sent",
        googleResponse: JSON.stringify(result),
        sentAt: new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.businessProfilePost.update({
      where: { id: post.id },
      data: { status: "error", googleResponse: message },
    });
  }

  return true;
}
