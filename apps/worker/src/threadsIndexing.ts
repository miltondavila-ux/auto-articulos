import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  encryptSecret,
  publishThread,
  refreshThreadsToken,
} from "@auto-articulos/shared";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

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

    const threadsContent = await buildThreadsStorytellingCopy(finalTitle, summary, articleUrl);

    const result = await publishThread(
      accessToken,
      integration.threadsUserId,
      threadsContent
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
