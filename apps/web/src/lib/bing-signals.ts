import { prisma } from "@auto-articulos/db";
import { getBingQueryStats, type BingQueryStat } from "@auto-articulos/shared";
import { getBingTokenForIntegration } from "@/lib/bing-token";

export type BingSignals = {
  connected: boolean;
  siteUrl?: string;
  rows: BingQueryStat[];
  error?: string;
};

/** Consulta Bing Webmaster Tools de forma opcional: ningún fallo de Bing debe bloquear oportunidades. */
export async function getBingSignals(userId: string): Promise<BingSignals> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true } });
  const integration = await prisma.searchIntegration.findFirst({ where: { userId, provider: "bing", ...(user.selectedSiteDomain ? { siteDomain: user.selectedSiteDomain } : {}) } });
  if (!integration?.siteUrl) return { connected: false, rows: [] };
  try {
    const accessToken = await getBingTokenForIntegration(integration);
    const rows = await getBingQueryStats(accessToken, integration.siteUrl);
    return { connected: true, siteUrl: integration.siteUrl, rows };
  } catch (error) {
    return {
      connected: true,
      siteUrl: integration.siteUrl,
      rows: [],
      error: error instanceof Error ? error.message : "No se pudieron consultar las señales de Bing Webmaster Tools.",
    };
  }
}

export function summarizeBingSignals(signals: BingSignals) {
  const rows = [...signals.rows].sort((a, b) => b.impressions - a.impressions);
  return {
    source: "bing-webmaster-tools",
    connected: signals.connected,
    siteUrl: signals.siteUrl,
    error: signals.error,
    totalQueries: rows.length,
    topQueries: rows.slice(0, 300),
  };
}
