import "dotenv/config";
import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  composioSubmitSitemap,
  getGoogleAccessToken,
  methodFor,
  resolveConnection,
  submitGoogleSitemap,
  submitBingSitemap,
} from "@auto-articulos/shared";
import { getBingTokenForIntegration } from "./bingToken";
import { loadConnectionState } from "./composio-connection-state";

const CONCURRENCY = 5;

interface SitemapResult {
  userId: string;
  ok: boolean;
  error?: string;
}

async function submitForUser(integration: {
  id: string;
  userId: string;
  provider: string;
  encryptedRefreshToken: string;
  siteUrl: string | null;
  sitemapUrl: string | null;
  siteDomain: string;
}): Promise<SitemapResult> {
  if (!integration.siteUrl || !integration.sitemapUrl) {
    return {
      userId: integration.userId,
      ok: false,
      error: "Configuración incompleta.",
    };
  }
  const providerLabel =
    integration.provider === "bing" ? "Bing Webmaster Tools" : "Google Search Console";

  try {
    if (integration.provider === "google" && await shouldUseComposio(integration)) {
      const state = await loadConnectionState(integration.userId, "google_search_console", integration.siteDomain);
      if (!state.composio?.connectedAccountId || !state.composio.siteUrl) {
        throw new Error("Search Console requiere reconectar la cuenta por Composio y seleccionar un sitio.");
      }
      const apiKey = await getComposioApiKey();
      if (!apiKey) throw new Error("La conexión por Composio no está configurada.");
      await composioSubmitSitemap(
        { apiKey, userId: integration.userId, connectedAccountId: state.composio.connectedAccountId },
        state.composio.siteUrl,
        integration.sitemapUrl,
      );
    } else {
      const accessToken = integration.provider === "bing"
        ? await getBingTokenForIntegration(integration)
        : await getGoogleAccessToken(decryptSecret(integration.encryptedRefreshToken));
      if (integration.provider === "bing") {
        await submitBingSitemap(accessToken, integration.siteUrl, integration.sitemapUrl);
      } else {
        await submitGoogleSitemap(accessToken, integration.siteUrl, integration.sitemapUrl);
      }
    }

    // Solo se llega aquí si submitGoogleSitemap confirmó una respuesta ok de
    // la API de Search Console (si no, lanza y cae al catch de abajo). Recién
    // ahí se marca cada artículo publicado como incluido en este envío —
    // nunca en un intento fallido, pendiente o sin verificar.
    const sentAt = new Date();
    const publishedTitles = await prisma.title.findMany({
      where: { run: { userId: integration.userId }, status: "success" },
      select: { id: true },
    });
    await prisma.$transaction([
      prisma.searchIntegration.update({
        where: { id: integration.id },
        data: {
          lastSitemapSyncAt: sentAt,
          lastSitemapSyncStatus: "success",
          lastSitemapSyncError: null,
        },
      }),
      ...(publishedTitles.length > 0
        ? [
            prisma.title.updateMany({
              where: { id: { in: publishedTitles.map((t) => t.id) } },
              data: { lastSitemapSentAt: sentAt },
            }),
            prisma.titleEvent.createMany({
              data: publishedTitles.map((t) => ({
                titleId: t.id,
                message: `Sitemap enviado a ${providerLabel} (envío diario).`,
                createdAt: sentAt,
              })),
            }),
          ]
        : []),
    ]);

    console.log(`Sitemap enviado para el usuario ${integration.userId}.`);
    return { userId: integration.userId, ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.searchIntegration.update({
      where: { id: integration.id },
      data: {
        lastSitemapSyncAt: new Date(),
        lastSitemapSyncStatus: "error",
        lastSitemapSyncError: message,
      },
    });
    console.error(
      `No se pudo enviar el sitemap del usuario ${integration.userId}: ${message}`,
    );
    return { userId: integration.userId, ok: false, error: message };
  }
}

async function getComposioApiKey(): Promise<string | null> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: "composio_api_key" } });
  if (!setting) return null;
  try { return decryptSecret(setting.encryptedValue); } catch { return null; }
}

async function shouldUseComposio(integration: { userId: string; siteDomain: string }): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: integration.userId }, select: { role: true, disabledModules: true } });
  const moduleEnabled = user?.role === "admin" || (() => {
    try { return JSON.parse(user?.disabledModules ?? "{}")?.["conexion-composio"] === "enabled"; }
    catch { return false; }
  })();
  const method = methodFor({ app: "google_search_console", userId: integration.userId, moduleEnabled, routeIsComposio: false });
  const state = await loadConnectionState(integration.userId, "google_search_console", integration.siteDomain);
  return resolveConnection({ method, hasOwn: state.hasOwn, composio: state.composio }).source === "COMPOSIO";
}

export async function sendDailySitemaps(): Promise<SitemapResult[]> {
  const integrations = await prisma.searchIntegration.findMany({
    where: {
      provider: { in: ["google", "bing"] },
      siteUrl: { not: null },
      sitemapUrl: { not: null },
    },
    select: {
      id: true,
      userId: true,
      provider: true,
      encryptedRefreshToken: true,
      siteUrl: true,
      sitemapUrl: true,
      siteDomain: true,
      user: { select: { selectedSiteDomain: true } },
    },
    orderBy: { userId: "asc" },
  }).then((rows) => rows.filter((row) => !row.user.selectedSiteDomain || row.siteDomain === row.user.selectedSiteDomain));

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
