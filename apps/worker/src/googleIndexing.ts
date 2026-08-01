import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getGoogleAccessToken,
  inspectGoogleUrl,
  submitGoogleSitemap,
} from "@auto-articulos/shared";

/**
 * El sitemap es el mismo para todo el sitio: reenviarlo por cada artículo de
 * un mismo lote no aporta nada (Google igual lo rastrea una sola vez y
 * descubre todas las URLs nuevas) y gasta cuota de la API de Search Console
 * de más. Pedido explícito del usuario (1/8/2026): un solo envío de sitemap
 * por lote, no uno por artículo. Se detecta consultando si YA hay otro
 * título de este mismo `runId` con `googleIndexingAt` seteado (o sea, que ya
 * pasó por acá antes) — si lo hay, no se reenvía el sitemap, pero cada
 * artículo sigue teniendo su propio chequeo de indexación (eso sí es
 * legítimamente por-URL) y su propio "check" visible de que el objetivo del
 * sitemap se cumplió para su lote.
 */
export async function notifyGoogle(
  titleId: string,
  userId: string,
  runId: string,
) {
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

    const sitemapAlreadySentForThisRun = await prisma.title.count({
      where: { runId, id: { not: titleId }, googleIndexingAt: { not: null } },
    });
    if (sitemapAlreadySentForThisRun === 0) {
      await submitGoogleSitemap(
        token,
        integration.siteUrl,
        integration.sitemapUrl,
      );
    }

    const title = await prisma.title.findUnique({
      where: { id: titleId },
      select: { articleUrl: true },
    });
    const inspection = title?.articleUrl
      ? await inspectGoogleUrl(token, integration.siteUrl, title.articleUrl)
      : null;
    const indexed = inspection?.verdict === "PASS";
    const sitemapNote =
      sitemapAlreadySentForThisRun > 0
        ? "✓ Sitemap enviado para este lote (compartido con otros artículos del mismo lote)."
        : "✓ Sitemap enviado.";
    await prisma.title.update({
      where: { id: titleId },
      data: {
        googleIndexingStatus: indexed ? "indexed" : "inspection_pending",
        googleIndexingMessage: indexed
          ? `${sitemapNote} Google informa que la URL está indexada${inspection?.coverageState ? `: ${inspection.coverageState}` : "."}`
          : `${sitemapNote} Google todavía no reporta la URL como indexada${inspection?.coverageState ? `: ${inspection.coverageState}` : "."}`,
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
