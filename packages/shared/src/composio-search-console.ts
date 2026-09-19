import { runAllowedTool } from "./composio";
import type {
  GoogleSearchAnalyticsRow,
  GoogleUrlInspectionResult,
} from "./google-search-console";

/**
 * Adaptador de Search Console por Composio (CONEXION COMPOSIO, Fase 2b-2).
 *
 * Hace por Composio lo mismo que `google-search-console.ts` hace con un token propio, con las MISMAS
 * formas de respuesta, para que cada consumidor pueda cambiar de vía sin reescribirse. Solo usa las
 * herramientas de la lista blanca de `composio.ts`. INERTE: ningún consumidor lo importa todavía; el
 * resolvedor (`composio-resolver.ts`) decidirá cuándo usarlo.
 */

export interface ComposioSearchConsoleAccount {
  /** Clave de API de Composio del sistema. */
  apiKey: string;
  /** Persona dueña de la conexión (`user_id` de Composio = `User.id`). */
  userId: string;
  /** Cuenta conectada de Search Console en Composio. */
  connectedAccountId: string;
}

async function run(
  account: ComposioSearchConsoleAccount,
  toolSlug: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const result = await runAllowedTool(account.apiKey, {
    app: "google_search_console",
    userId: account.userId,
    connectedAccountId: account.connectedAccountId,
    toolSlug,
    args,
  });
  const data = result.data;
  return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
}

/** Igual que `listGoogleSearchConsoleSites`. */
export async function composioListSearchConsoleSites(
  account: ComposioSearchConsoleAccount,
): Promise<Array<{ siteUrl: string; permissionLevel: string }>> {
  const data = await run(account, "GOOGLE_SEARCH_CONSOLE_LIST_SITES", {});
  return (data.siteEntry as Array<{ siteUrl: string; permissionLevel: string }> | undefined) ?? [];
}

/** Igual que `listGoogleSitemaps`. */
export async function composioListSitemaps(
  account: ComposioSearchConsoleAccount,
  siteUrl: string,
): Promise<string[]> {
  const data = await run(account, "GOOGLE_SEARCH_CONSOLE_LIST_SITEMAPS", { site_url: siteUrl });
  const sitemaps = (data.sitemap as Array<{ path?: string }> | undefined) ?? [];
  return sitemaps.map((sitemap) => sitemap.path ?? "").filter(Boolean);
}

/** Igual que `submitGoogleSitemap`. */
export async function composioSubmitSitemap(
  account: ComposioSearchConsoleAccount,
  siteUrl: string,
  sitemapUrl: string,
): Promise<void> {
  await run(account, "GOOGLE_SEARCH_CONSOLE_SUBMIT_SITEMAP", { site_url: siteUrl, feedpath: sitemapUrl });
}

/** Igual que `inspectGoogleUrl`. */
export async function composioInspectUrl(
  account: ComposioSearchConsoleAccount,
  siteUrl: string,
  inspectionUrl: string,
): Promise<GoogleUrlInspectionResult> {
  const data = await run(account, "GOOGLE_SEARCH_CONSOLE_INSPECT_URL", {
    site_url: siteUrl,
    inspection_url: inspectionUrl,
    language_code: "es",
  });
  const inspection = data.inspectionResult as { indexStatusResult?: GoogleUrlInspectionResult } | undefined;
  return inspection?.indexStatusResult ?? {};
}

/** Igual que `queryGoogleSearchAnalytics`. */
export async function composioQuerySearchAnalytics(
  account: ComposioSearchConsoleAccount,
  siteUrl: string,
  startDate: string,
  endDate: string,
  dimensions: string[] = ["query", "page"],
): Promise<GoogleSearchAnalyticsRow[]> {
  const data = await run(account, "GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY", {
    site_url: siteUrl,
    start_date: startDate,
    end_date: endDate,
    dimensions,
    row_limit: 5000,
    data_state: "final",
  });
  return (data.rows as GoogleSearchAnalyticsRow[] | undefined) ?? [];
}
