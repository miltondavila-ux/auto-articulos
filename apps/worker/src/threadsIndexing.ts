import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  encryptSecret,
  publishThread,
  refreshThreadsToken,
} from "@auto-articulos/shared";

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

    // Armar el texto del Hilo
    const postTitle = title.finalTitle || title.text;
    const postSummary = title.summary ? `\n\n${title.summary}` : "";
    const postLink = `\n\nLeer artículo completo: ${title.articleUrl}`;

    const rawContent = `${postTitle}${postSummary}${postLink}`;

    const result = await publishThread(
      accessToken,
      integration.threadsUserId,
      rawContent
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
