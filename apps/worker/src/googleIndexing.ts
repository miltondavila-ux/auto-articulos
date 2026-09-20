import { prisma } from "@auto-articulos/db";
import {
  composioInspectUrl,
  decryptSecret,
  getGoogleAccessToken,
  inspectGoogleUrl,
  methodFor,
  resolveConnection,
} from "@auto-articulos/shared";
import { loadConnectionState } from "./composio-connection-state";

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
    const title = await prisma.title.findUnique({ where: { id: titleId }, select: { articleUrl: true } });
    const state = await loadConnectionState(userId, "google_search_console", integration.siteDomain);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, disabledModules: true } });
    const moduleEnabled = user?.role === "admin" || (() => {
      try { return JSON.parse(user?.disabledModules ?? "{}")?.["conexion-composio"] === "enabled"; }
      catch { return false; }
    })();
    const method = methodFor({ app: "google_search_console", moduleEnabled, routeIsComposio: false });
    const resolved = resolveConnection({ method, hasOwn: state.hasOwn, composio: state.composio });
    const inspection = title?.articleUrl && resolved.source === "COMPOSIO" && state.composio?.siteUrl
      ? await composioInspectUrl(
          { apiKey: await getComposioApiKey(), userId, connectedAccountId: state.composio.connectedAccountId },
          state.composio.siteUrl,
          title.articleUrl,
        )
      : title?.articleUrl
        ? await inspectGoogleUrl(
            await getGoogleAccessToken(decryptSecret(integration.encryptedRefreshToken)),
            integration.siteUrl,
            title.articleUrl,
          )
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

async function getComposioApiKey(): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: "composio_api_key" } });
  if (!setting) throw new Error("La conexión por Composio no está configurada.");
  return decryptSecret(setting.encryptedValue);
}
