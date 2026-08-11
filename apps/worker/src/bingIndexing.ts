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
 *
 * Bug encontrado el 11/8/2026: en lotes de varios artículos, el token OAuth
 * de Bing a veces falla con "InvalidToken" de forma intermitente (funciona
 * para unos títulos y para otros no, sin causa aparente). Se agrega reintento
 * con regeneración del token para que un fallo transitorio no marque el
 * artículo como error permanente.
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

  const title = await prisma.title.findUnique({
    where: { id: titleId },
    select: { articleUrl: true },
  });
  if (!title?.articleUrl) {
    await prisma.title.update({
      where: { id: titleId },
      data: { bingIndexingStatus: "error", bingIndexingMessage: "El artículo todavía no tiene URL para indexar.", bingIndexingAt: new Date() },
    });
    return;
  }

  const refreshToken = decryptSecret(integration.encryptedRefreshToken);
  const MAX_RETRIES = 2;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const token = await getBingAccessToken(refreshToken);
      await submitBingUrl(token, integration.siteUrl, title.articleUrl);
      await prisma.title.update({
        where: { id: titleId },
        data: {
          bingIndexingStatus: "submitted",
          bingIndexingMessage: "Se pidió indexación instantánea a Bing.",
          bingIndexingAt: new Date(),
        },
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isTokenError = /invalid.*token|unauthorized|401/i.test(message);

      if (isTokenError && attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        continue;
      }

      await prisma.title.update({
        where: { id: titleId },
        data: {
          bingIndexingStatus: "error",
          bingIndexingMessage: message,
          bingIndexingAt: new Date(),
        },
      });
      return;
    }
  }
}
