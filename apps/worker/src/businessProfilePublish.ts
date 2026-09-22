import { prisma } from "@auto-articulos/db";
import { createHash } from "node:crypto";
import {
  decryptSecret,
  getGoogleAccessToken,
  createLocalPost,
  createPostPeerPost,
} from "@auto-articulos/shared";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { getArticleOpenGraphImage } from "./socialPublish";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

// Límite real y documentado de Google para el campo "summary" de una
// publicación de Business Profile — pedido explícito del usuario, 5/8/2026
// (corregido en la misma conversación: no son 100 caracteres, son más de
// 1000; 1500 es el límite práctico que usa Google en su propia interfaz).
const MAX_GBP_SUMMARY_LEN = 1500;
const POSTPEER_GBP_READY = process.env.POSTPEER_GBP_CONSUMER_READY === "true";

async function getGoogleBusinessImageUrl(titleId: string, imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`La imagen del artículo no se pudo descargar (HTTP ${response.status}).`);
  const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "image/webp") return imageUrl;

  // Es la misma imagen del artículo, con las mismas dimensiones y sin recorte;
  // solo se cambia WEBP a JPEG porque Google documenta PHOTO/JPG/PNG para GBP.
  const jpeg = await sharp(Buffer.from(await response.arrayBuffer()))
    .jpeg({ quality: 95, mozjpeg: true })
    .toBuffer();
  const blob = await put(`google-business/${titleId}-article.jpg`, jpeg, {
    access: "public",
    contentType: "image/jpeg",
    allowOverwrite: true,
  });
  const check = await fetch(blob.url, { method: "HEAD", signal: AbortSignal.timeout(10000) });
  if (!check.ok) throw new Error("La copia JPEG pública de la imagen del artículo no está disponible.");
  return blob.url;
}

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
    // GBP debe usar estrictamente la imagen real del artículo: primero la
    // imagen guardada en la oportunidad y, si falta, la og:image del artículo.
    // No se genera, recorta ni adapta ninguna imagen.
    const articleImageUrl = candidate.socialOpportunities[0]?.imageUrl
      ?? await getArticleOpenGraphImage(candidate.articleUrl ?? "");
    if (!articleImageUrl) {
      throw new Error("El artículo no tiene una og:image pública para Google Business Profile.");
    }
    const imageUrl = await getGoogleBusinessImageUrl(candidate.id, articleImageUrl);

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
        // Si un intento anterior falló en PostPeer, no reutilizar su respuesta
        // fallida: la imagen/formato actual forma parte de la identidad del
        // intento. Así un reintento corregido no queda atrapado por la clave
        // idempotente del intento anterior.
        idempotencyKey: `business-profile-${candidate.id}-${createHash("sha256").update(imageUrl).digest("hex").slice(0, 16)}`,
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
