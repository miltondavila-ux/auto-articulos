import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  encryptSecret,
  publishThread,
  refreshThreadsToken,
} from "@auto-articulos/shared";
import { put } from "@vercel/blob";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";

/**
 * Pide a la IA un copy estilo Threads de tipo storytelling, amigable y cercano.
 */
async function buildThreadsStorytellingCopy(
  finalTitle: string,
  summary: string,
  articleUrl: string
): Promise<string> {
  if (!OPENAI_API_KEY) {
    return `${finalTitle}\n\n${summary}\n\nLeer más: ${articleUrl}`.slice(0, 490);
  }
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
              `Escribe una publicación muy amigable y cercana al estilo de la red social Threads (conversacional, en primera persona, empática y de tipo storytelling). \n` +
              `Debes estructurarlo con: \n` +
              `1. Un gancho inicial en forma de pregunta empática (Ej: "¿Te ha pasado que...?" o "¿Sabías que...?"). \n` +
              `2. Una breve historia o reflexión interesante basada en el tema del artículo.\n` +
              `3. Una invitación natural y cálida para leer el artículo completo, usando el enlace proporcionado.\n\n` +
              `REGLAS ESTRICTAS:\n` +
              `- El texto total DEBE ser menor a 400 caracteres para asegurar que quepa el enlace y no se corte.\n` +
              `- No uses hashtags ni markdown, solo texto plano.\n` +
              `- No uses palabras demasiado corporativas o acartonadas.\n\n` +
              `Título del artículo: ${finalTitle}\n` +
              `Resumen: ${summary}\n` +
              `Enlace a incluir: ${articleUrl}`,
          },
        ],
        temperature: 0.8,
        max_tokens: 300,
      }),
    });
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!response.ok || !text) {
      return `${finalTitle}\n\n${summary}\n\nLeer más: ${articleUrl}`.slice(0, 490);
    }
    return text;
  } catch {
    return `${finalTitle}\n\n${summary}\n\nLeer más: ${articleUrl}`.slice(0, 490);
  }
}

/**
 * Genera la imagen con DALL-E al estilo Threads y la sube a Vercel Blob.
 */
async function generateAndHostThreadsImage(
  titleId: string,
  summary: string
): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;

  const prompt = `Una imagen de estilo fotografía casual, cálida, real y cercana con personas, libre de texto, que represente de forma conceptual el siguiente tema: ${summary}. Estilo moderno adecuado para la red social Threads.`;

  try {
    const response = await fetch(OPENAI_IMAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt.slice(0, 900),
        size: "1024x1024",
        quality: "standard",
        n: 1,
      }),
    });
    const data = (await response.json()) as {
      data?: { url?: string; b64_json?: string }[];
      error?: { message?: string };
    };

    const imageUrl = data.data?.[0]?.url;
    const b64 = data.data?.[0]?.b64_json;
    let buffer: Buffer;

    if (b64) {
      buffer = Buffer.from(b64, "base64");
    } else if (imageUrl) {
      const imgRes = await fetch(imageUrl);
      const arrayBuffer = await imgRes.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      throw new Error(data.error?.message ?? "No se recibió imagen de OpenAI.");
    }

    const blob = await put(`threads/${titleId}.png`, buffer, {
      access: "public",
      contentType: "image/png",
    });
    return blob.url;
  } catch (err) {
    console.error("Fallo al generar imagen para Threads:", err);
    return null;
  }
}

/**
 * Publica un Hilo automático en Meta Threads tras divulgar el artículo en 10minutesWebsite.
 * Es un proceso no bloqueante: si falla o no está configurado, la publicación del artículo se mantiene exitosa.
 */
export async function notifyThreads(titleId: string, userId: string): Promise<void> {
  const integration = await prisma.threadsIntegration.findUnique({
    where: { userId },
  });

  if (!integration) {
    await prisma.title.update({
      where: { id: titleId },
      data: { threadsPublishStatus: "not_configured" },
    });
    return;
  }

  const title = await prisma.title.findUnique({
    where: { id: titleId },
  });

  if (!title || !title.articleUrl) {
    return;
  }

  try {
    let accessToken = decryptSecret(integration.accessTokenEncrypted);

    // Refrescar automáticamente el token si vence en menos de 7 días
    const daysUntilExpiration =
      (integration.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

    if (daysUntilExpiration < 7) {
      try {
        const refreshed = await refreshThreadsToken(accessToken);
        accessToken = refreshed.accessToken;
        const newExpiresAt = new Date(Date.now() + refreshed.expiresInSeconds * 1000);

        await prisma.threadsIntegration.update({
          where: { userId },
          data: {
            accessTokenEncrypted: encryptSecret(accessToken),
            expiresAt: newExpiresAt,
          },
        });
      } catch (refreshErr) {
        console.warn("No se pudo autorrefrescar el token de Threads:", refreshErr);
      }
    }

    // Armar el texto y generar la imagen estilo Threads
    const finalTitle = title.finalTitle || title.text;
    const summary = title.summary || "";
    const articleUrl = title.articleUrl;

    const [threadsContent, threadsImageUrl] = await Promise.all([
      buildThreadsStorytellingCopy(finalTitle, summary, articleUrl),
      generateAndHostThreadsImage(titleId, summary),
    ]);

    const result = await publishThread(
      accessToken,
      integration.threadsUserId,
      threadsContent,
      threadsImageUrl ?? undefined
    );

    await prisma.title.update({
      where: { id: titleId },
      data: {
        threadsPublishStatus: "success",
        threadsPostId: result.postId,
        threadsPublishAt: new Date(),
        threadsPublishError: null,
      },
    });

    await prisma.titleEvent.create({
      data: {
        titleId,
        message: `Publicado exitosamente en Meta Threads (@${integration.threadsUsername || integration.threadsUserId}) - ID: ${result.postId}`,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error al publicar en Meta Threads para title ${titleId}:`, errorMsg);

    await prisma.title.update({
      where: { id: titleId },
      data: {
        threadsPublishStatus: "error",
        threadsPublishError: errorMsg,
      },
    });

    await prisma.titleEvent.create({
      data: {
        titleId,
        message: `Publicación en Meta Threads falló: ${errorMsg}`,
      },
    });
  }
}
