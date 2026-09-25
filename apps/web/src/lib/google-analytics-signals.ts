import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getGoogleAnalyticsAccessToken,
  queryGoogleAnalyticsSummary,
  runAllowedTool,
} from "@auto-articulos/shared";
import { getStoredComposioApiKey } from "./composio";

export type GoogleAnalyticsSignals = {
  connected: boolean;
  propertyId?: string;
  rows: Array<{ pagePath?: string; pageTitle?: string; views?: number; sessions: number; activeUsers: number; events?: number; engagementRate?: number; bounceRate?: number; conversions?: number }>;
  error?: string;
};

/** Consulta GA4 de forma opcional: ningún fallo de Analytics debe bloquear oportunidades. */
export async function getGoogleAnalyticsSignals(userId: string): Promise<GoogleAnalyticsSignals> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true } });
  const [integration, composio] = await Promise.all([
    prisma.searchIntegration.findFirst({ where: { userId, provider: "google-analytics", ...(user.selectedSiteDomain ? { siteDomain: user.selectedSiteDomain } : {}) } }),
    prisma.composioConnection.findFirst({
      where: {
        userId,
        app: "google_analytics",
        status: "ACTIVE",
        ...(user.selectedSiteDomain ? { OR: [{ siteDomain: user.selectedSiteDomain }, { siteDomain: "" }] } : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: { connectedAccountId: true, propertyId: true },
    }),
  ]);
  if (composio?.propertyId) {
    const apiKey = await getStoredComposioApiKey();
    if (!apiKey) return { connected: true, propertyId: composio.propertyId, rows: [], error: "Composio no tiene API key configurada." };
    try {
      const response = await runAllowedTool(apiKey, {
        app: "google_analytics",
        userId,
        connectedAccountId: composio.connectedAccountId,
        toolSlug: "GOOGLE_ANALYTICS_RUN_REPORT",
        args: {
          property: `properties/${composio.propertyId}`,
          dateRanges: [{ startDate: "90daysAgo", endDate: "today" }],
          dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
          limit: 100,
        },
      });
      const rawRows = Array.isArray((response.data as { rows?: unknown[] } | null)?.rows)
        ? ((response.data as { rows: Array<Record<string, unknown>> }).rows)
        : [];
      const rows = rawRows.map((row) => {
        const dimensionValues = Array.isArray(row.dimensionValues) ? row.dimensionValues : [];
        const metricValues = Array.isArray(row.metricValues) ? row.metricValues : [];
        const dim = (index: number) => {
          const value = dimensionValues[index];
          return value && typeof value === "object" && "value" in value ? String((value as { value?: unknown }).value ?? "") : "";
        };
        const metric = (index: number) => {
          const value = metricValues[index];
          const raw = value && typeof value === "object" && "value" in value ? Number((value as { value?: unknown }).value) : 0;
          return Number.isFinite(raw) ? raw : 0;
        };
        return {
          pagePath: dim(0),
          pageTitle: dim(1),
          sessions: metric(0),
          activeUsers: metric(1),
        };
      });
      return { connected: true, propertyId: composio.propertyId, rows };
    } catch (error) {
      return { connected: true, propertyId: composio.propertyId, rows: [], error: error instanceof Error ? error.message : "No se pudieron consultar las señales de Google Analytics por Composio." };
    }
  }
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
