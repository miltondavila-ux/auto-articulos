import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getGoogleAccessToken,
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
    await prisma.title.update({
      where: { id: titleId },
      data: {
        googleIndexingStatus: "sitemap_submitted",
        googleIndexingMessage: "Sitemap enviado a Google Search Console.",
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
