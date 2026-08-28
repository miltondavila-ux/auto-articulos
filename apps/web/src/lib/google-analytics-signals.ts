import { prisma } from "@auto-articulos/db";
import { decryptSecret, getGoogleAnalyticsAccessToken, queryGoogleAnalyticsSummary } from "@auto-articulos/shared";

export type GoogleAnalyticsSignals = {
  connected: boolean;
  propertyId?: string;
  rows: Array<{ pagePath?: string; sessions: number; activeUsers: number; engagementRate?: number; conversions?: number }>;
  error?: string;
};

/** Consulta GA4 de forma opcional: ningún fallo de Analytics debe bloquear oportunidades. */
export async function getGoogleAnalyticsSignals(userId: string): Promise<GoogleAnalyticsSignals> {
  const integration = await prisma.searchIntegration.findUnique({ where: { userId_provider: { userId, provider: "google-analytics" } } });
  if (!integration?.siteUrl || !integration.encryptedRefreshToken) return { connected: false, rows: [] };
  try {
    const accessToken = await getGoogleAnalyticsAccessToken(decryptSecret(integration.encryptedRefreshToken));
    const summary = await queryGoogleAnalyticsSummary(accessToken, integration.siteUrl);
    return { connected: true, propertyId: integration.siteUrl, rows: summary.rows };
  } catch (error) {
    return { connected: true, propertyId: integration.siteUrl, rows: [], error: error instanceof Error ? error.message : "No se pudieron consultar las señales de Google Analytics." };
  }
}

export function summarizeGoogleAnalyticsSignals(signals: GoogleAnalyticsSignals) {
  const rows = [...signals.rows].sort((a, b) => b.sessions - a.sessions);
  return {
    source: "google-analytics-4",
    connected: signals.connected,
    propertyId: signals.propertyId,
    error: signals.error,
    totalPages: rows.length,
    topPages: rows.slice(0, 100),
    totals: rows.reduce((total, row) => ({ sessions: total.sessions + row.sessions, activeUsers: total.activeUsers + row.activeUsers, conversions: (total.conversions ?? 0) + (row.conversions ?? 0) }), { sessions: 0, activeUsers: 0, conversions: 0 }),
  };
}
