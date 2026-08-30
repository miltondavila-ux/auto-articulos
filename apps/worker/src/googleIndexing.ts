import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getGoogleAccessToken,
  inspectGoogleUrl,
} from "@auto-articulos/shared";

/**
 * Después de publicar solo se consulta el estado de indexación de esta URL.
 * Los sitemaps ya no se envían por artículo ni por lote: un workflow diario
 * independiente envía una vez el sitemap configurado de cada usuario.
 */
export async function notifyGoogle(titleId: string, userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true } });
  const integration = await prisma.searchIntegration.findFirst({
    where: { userId, provider: "google", ...(user.selectedSiteDomain ? { siteDomain: user.selectedSiteDomain } : {}) },
  });
  if (!integration?.siteUrl) {
    await prisma.title.update({
      where: { id: titleId },
      data: { googleIndexingStatus: "not_configured" },
    });
    return;
  }
  try {
    const token = await getGoogleAccessToken(
      decryptSecret(integration.encryptedRefreshToken),
    );

    const title = await prisma.title.findUnique({
      where: { id: titleId },
      select: { articleUrl: true },
    });
    const inspection = title?.articleUrl
      ? await inspectGoogleUrl(token, integration.siteUrl, title.articleUrl)
      : null;
    const indexed = inspection?.verdict === "PASS";
    await prisma.title.update({
      where: { id: titleId },
      data: {
        googleIndexingStatus: indexed ? "indexed" : "inspection_pending",
        googleIndexingMessage: indexed
          ? `Google informa que la URL está indexada${inspection?.coverageState ? `: ${inspection.coverageState}` : "."}`
          : `Google todavía no reporta la URL como indexada${inspection?.coverageState ? `: ${inspection.coverageState}` : "."}`,
        googleIndexingAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.title.update({
      where: { id: titleId },
      data: {
        googleIndexingStatus: "error",
        googleIndexingMessage:
          error instanceof Error ? error.message : String(error),
        googleIndexingAt: new Date(),
      },
    });
  }
}
