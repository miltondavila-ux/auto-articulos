import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getBingAccessToken,
  submitBingUrl,
} from "@auto-articulos/shared";

/**
 * Pide a Bing indexación instantánea de la URL recién publicada — a
 * diferencia de Google (cuya Indexing API solo aplica a ofertas de empleo o
 * transmisiones en vivo), Bing sí lo permite para cualquier artículo. Pedido
 * explícito del usuario, 5/8/2026.
 */
export async function notifyBing(titleId: string, userId: string) {
  const integration = await prisma.searchIntegration.findUnique({
    where: { userId_provider: { userId, provider: "bing" } },
  });
  if (!integration?.siteUrl) {
    await prisma.title.update({
      where: { id: titleId },
      data: { bingIndexingStatus: "not_configured" },
    });
    return;
  }
  try {
    const token = await getBingAccessToken(
      decryptSecret(integration.encryptedRefreshToken),
    );
    const title = await prisma.title.findUnique({
      where: { id: titleId },
      select: { articleUrl: true },
    });
    if (!title?.articleUrl) {
      throw new Error("El artículo todavía no tiene URL para indexar.");
    }
    await submitBingUrl(token, integration.siteUrl, title.articleUrl);
    await prisma.title.update({
      where: { id: titleId },
      data: {
        bingIndexingStatus: "submitted",
        bingIndexingMessage: "Se pidió indexación instantánea a Bing.",
        bingIndexingAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.title.update({
      where: { id: titleId },
      data: {
        bingIndexingStatus: "error",
        bingIndexingMessage:
          error instanceof Error ? error.message : String(error),
        bingIndexingAt: new Date(),
      },
    });
  }
}
