import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getGoogleAccessToken,
  inspectGoogleUrl,
  submitGoogleSitemap,
} from "@auto-articulos/shared";

export async function notifyGoogle(titleId: string, userId: string) {
  const integration = await prisma.searchIntegration.findUnique({
    where: { userId_provider: { userId, provider: "google" } },
  });
  if (!integration?.siteUrl || !integration.sitemapUrl) {
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
    await submitGoogleSitemap(
      token,
      integration.siteUrl,
      integration.sitemapUrl,
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
          : `Sitemap enviado. Google todavía no reporta la URL como indexada${inspection?.coverageState ? `: ${inspection.coverageState}` : "."}`,
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
