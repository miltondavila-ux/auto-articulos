import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getGoogleAccessToken,
  createLocalPost,
  createPostPeerPost,
} from "@auto-articulos/shared";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

// Límite real y documentado de Google para el campo "summary" de una
// publicación de Business Profile — pedido explícito del usuario, 5/8/2026
// (corregido en la misma conversación: no son 100 caracteres, son más de
// 1000; 1500 es el límite práctico que usa Google en su propia interfaz).
const MAX_GBP_SUMMARY_LEN = 1500;
const POSTPEER_GBP_READY = process.env.POSTPEER_GBP_CONSUMER_READY === "true";

function articleUrlVariants(value: string): string[] {
  const variants = new Set([value.trim()]);
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const canonical = `${url.protocol}//${host}${path}${url.search}${url.hash}`;
    variants.add(canonical);
    variants.add(`${url.protocol}//www.${host}${path}${url.search}${url.hash}`);
  } catch {
    // Si no es una URL absoluta, se conserva el valor original.
  }
  return [...variants];
}

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
 * Procesa UNA publicación pendiente de enviar a Google Business Profile.
 * Devuelve true si hizo algo. Se "reserva" el título creando primero el
 * registro BusinessProfilePost (titleId es único): si otro proceso ya lo
 * creó, la creación falla y este lane simplemente no hizo nada — no hace
 * falta el mismo bloqueo por usuario que usa queue.ts, porque esto no abre
 * ninguna sesión de Playwright contra 10minutesWebsite.
 */
export async function processNextBusinessProfilePost(
  filterUserId?: string,
  filterArticleUrl?: string,
): Promise<boolean> {
  const candidate = await prisma.title.findFirst({
    where: {
      status: "success",
      articleUrl: { not: null },
      ...(filterArticleUrl ? { articleUrl: { in: articleUrlVariants(filterArticleUrl) } } : {}),
      summary: { not: null },
      OR: [
        { businessProfilePost: null },
        { businessProfilePost: { status: "pending" } },
      ],
      run: {
        ...(filterUserId ? { userId: filterUserId } : {}),
        user: {
          OR: [
            { businessProfileIntegration: { locationName: { not: null } } },
            ...(POSTPEER_GBP_READY ? [{ postPeerConnection: { status: "ACTIVE" as const } }] : []),
          ],
        },
      },
    },
    orderBy: { processedAt: "asc" },
    include: {
      businessProfilePost: true,
      socialOpportunities: {
        where: { platform: "google-business" },
        select: { imageUrl: true },
        take: 1,
      },
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
  if (!integration?.locationName && !POSTPEER_GBP_READY) return false;

  let post = candidate.businessProfilePost;
  if (!post) {
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
  }

  try {
    const finalTitle = candidate.finalTitle ?? candidate.text;
    const summary = candidate.summary ?? "";
    const gbpSummary = await buildBusinessProfileSummary(finalTitle, summary);
    // GBP debe usar estrictamente la imagen ya guardada del artículo.
    // PostPeer recibe esta URL sin recorte ni adaptación de formato.
    const imageUrl = candidate.socialOpportunities[0]?.imageUrl ?? null;

    const postPeerConnection = POSTPEER_GBP_READY
      ? await prisma.postPeerConnection.findUnique({ where: { userId: candidate.run.userId } })
      : null;
    let result: unknown;
    if (POSTPEER_GBP_READY) {
      if (postPeerConnection?.status !== "ACTIVE") {
        throw new Error("La conexión de PostPeer con Google Business Profile requiere reconexión.");
      }
      const setting = await prisma.systemSetting.findUnique({ where: { key: "postpeer_api_key" } });
      if (!setting) throw new Error("PostPeer no está configurado.");
      const postPeerApiKey = decryptSecret(setting.encryptedValue);
      result = await createPostPeerPost(postPeerApiKey, {
        accountId: postPeerConnection.accountId,
        content: `${gbpSummary}\n\n${candidate.articleUrl ?? ""}`,
        imageUrl: imageUrl ?? undefined,
        idempotencyKey: `business-profile-${candidate.id}`,
      });
    } else {
      if (!integration?.locationName) throw new Error("Google Business Profile no está conectado.");
      const accessToken = await getGoogleAccessToken(
        decryptSecret(integration.encryptedRefreshToken),
      );
      result = await createLocalPost(accessToken, integration.locationName, {
        summary: gbpSummary,
        ctaUrl: candidate.articleUrl ?? "",
        imageUrl: imageUrl ?? undefined,
      });
    }

    const rejected = (result as { state?: string; status?: string }).state === "REJECTED" || (result as { status?: string }).status === "failed";
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
    await prisma.socialOpportunity.updateMany({
      where: { titleId: candidate.id, platform: "google-business" },
      data: {
        status: rejected ? "error" : "published",
        progressPercent: 100,
        progressStage: rejected ? "Google Business Profile rechazó la publicación" : "Publicado en Google Business Profile mediante PostPeer",
        errorLog: rejected ? JSON.stringify(result) : null,
        postId: (result as { id?: string; url?: string }).url || (result as { id?: string }).id || null,
        publishedAt: rejected ? null : new Date(),
        finishedAt: new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.businessProfilePost.update({
      where: { id: post.id },
      data: { status: "error", googleResponse: message },
    });
    await prisma.socialOpportunity.updateMany({
      where: { titleId: candidate.id, platform: "google-business" },
      data: {
        status: "error",
        errorLog: message,
        progressStage: "Error al publicar en Google Business Profile mediante PostPeer",
        finishedAt: new Date(),
      },
    });
  }

  return true;
}
