import "dotenv/config";
import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getGoogleAccessToken,
  submitGoogleSitemap,
} from "@auto-articulos/shared";

const CONCURRENCY = 5;

interface SitemapResult {
  userId: string;
  ok: boolean;
  error?: string;
}

async function submitForUser(integration: {
  userId: string;
  encryptedRefreshToken: string;
  siteUrl: string | null;
  sitemapUrl: string | null;
}): Promise<SitemapResult> {
  if (!integration.siteUrl || !integration.sitemapUrl) {
    return {
      userId: integration.userId,
      ok: false,
      error: "Configuración incompleta.",
    };
  }

  try {
    const accessToken = await getGoogleAccessToken(
      decryptSecret(integration.encryptedRefreshToken),
    );
    await submitGoogleSitemap(
      accessToken,
      integration.siteUrl,
      integration.sitemapUrl,
    );

    // Solo se llega aquí si submitGoogleSitemap confirmó una respuesta ok de
    // la API de Search Console (si no, lanza y cae al catch de abajo). Recién
    // ahí se marca cada artículo publicado como incluido en este envío —
    // nunca en un intento fallido, pendiente o sin verificar.
    const publishedTitles = await prisma.title.findMany({
      where: { run: { userId: integration.userId }, status: "success" },
      select: { id: true },
    });
    if (publishedTitles.length > 0) {
      const sentAt = new Date();
      await prisma.$transaction([
        prisma.title.updateMany({
          where: { id: { in: publishedTitles.map((t) => t.id) } },
          data: { lastSitemapSentAt: sentAt },
        }),
        prisma.titleEvent.createMany({
          data: publishedTitles.map((t) => ({
            titleId: t.id,
            message: "Sitemap enviado a Google Search Console (envío diario).",
            createdAt: sentAt,
          })),
        }),
      ]);
    }

    console.log(`Sitemap enviado para el usuario ${integration.userId}.`);
    return { userId: integration.userId, ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `No se pudo enviar el sitemap del usuario ${integration.userId}: ${message}`,
    );
    return { userId: integration.userId, ok: false, error: message };
  }
}

export async function sendDailySitemaps(): Promise<SitemapResult[]> {
  const integrations = await prisma.searchIntegration.findMany({
    where: {
      provider: "google",
      siteUrl: { not: null },
      sitemapUrl: { not: null },
    },
    select: {
      userId: true,
      encryptedRefreshToken: true,
      siteUrl: true,
      sitemapUrl: true,
    },
    orderBy: { userId: "asc" },
  });

  console.log(
    `Envío diario: ${integrations.length} sitemap(s) de usuario configurado(s).`,
  );

  const results: SitemapResult[] = [];
  for (let index = 0; index < integrations.length; index += CONCURRENCY) {
    const batch = integrations.slice(index, index + CONCURRENCY);
    results.push(...(await Promise.all(batch.map(submitForUser))));
  }
  return results;
}

async function main() {
  const results = await sendDailySitemaps();
  const sent = results.filter((result) => result.ok).length;
  const failed = results.length - sent;
  console.log(
    `Envío diario terminado: ${sent} correcto(s), ${failed} fallido(s).`,
  );
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Error inesperado en el envío diario de sitemaps:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
