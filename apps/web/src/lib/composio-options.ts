import type { ComposioAppId } from "@auto-articulos/shared";
import { normalizeDomain } from "./domain-validation";

/**
 * Opciones que una persona puede elegir tras conectar una app por Composio:
 * el sitio de Search Console, la propiedad de Analytics, la Página de Facebook
 * o la cuenta de Instagram. Es lógica PURA (sin base de datos ni red): convierte
 * la respuesta de Composio en opciones y decide cuáles se pueden elegir.
 *
 * Reglas heredadas de la vía propia (site-selection / search-integrations):
 * - Solo se puede elegir entre lo que Google/Meta devuelven de verdad; nunca un
 *   texto libre.
 * - Una cuenta de SEO TOTAL trabaja con UN dominio; si ya tiene un dominio
 *   confirmado, solo se puede elegir el sitio que coincide con él.
 * - En Search Console solo sirven los sitios con permiso para enviar sitemaps.
 * - Nunca se devuelven tokens: solo identificador y nombre.
 */

export interface SelectionOption {
  id: string;
  label: string;
  detail: string | null;
  selectable: boolean;
  reason: string | null;
  recommended: boolean;
}

const PERMISSION_LABEL: Record<string, string> = {
  siteOwner: "Propietario",
  siteFullUser: "Usuario completo",
  siteRestrictedUser: "Usuario restringido",
  siteUnverifiedUser: "No verificado",
};
const CAN_SUBMIT_SITEMAPS = new Set(["siteOwner", "siteFullUser"]);

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const str = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

/** Primer arreglo de objetos que cumple `test`, buscando hasta 4 niveles. */
function findArray(data: unknown, test: (item: Json) => boolean, depth = 0): Json[] | null {
  if (Array.isArray(data)) {
    const items = data.filter(isObject);
    if (items.length > 0 && items.every(test)) return items;
    if (data.length === 0) return [];
    return null;
  }
  if (!isObject(data) || depth > 4) return null;
  for (const value of Object.values(data)) {
    const found = findArray(value, test, depth + 1);
    if (found) return found;
  }
  return null;
}

export function optionsForSearchConsole(data: unknown, confirmedDomain: string | null): SelectionOption[] {
  const sites = findArray(data, (item) => typeof item.siteUrl === "string") ?? [];
  const options = sites.map((site): SelectionOption => {
    const siteUrl = String(site.siteUrl);
    const permission = str(site.permissionLevel) ?? "";
    const domain = normalizeDomain(siteUrl);
    let reason: string | null = null;
    if (!CAN_SUBMIT_SITEMAPS.has(permission)) {
      reason = "Necesitas ser propietario o usuario completo de este sitio en Search Console.";
    } else if (confirmedDomain && domain !== confirmedDomain) {
      reason = `Tu cuenta trabaja con ${confirmedDomain}. Para otro dominio, usa otra cuenta de SEO TOTAL.`;
    }
    const isDomainProperty = siteUrl.startsWith("sc-domain:");
    return {
      id: siteUrl,
      label: isDomainProperty ? `${domain} (dominio completo)` : siteUrl,
      // El código exacto de la propiedad distingue sitios que se parecen (con/sin www, http/https, dominio completo).
      detail: [
        PERMISSION_LABEL[permission] ?? (permission || null),
        isDomainProperty ? "propiedad de dominio" : "prefijo de URL",
        `código ${siteUrl}`,
      ]
        .filter(Boolean)
        .join(" · "),
      selectable: reason === null,
      reason,
      recommended: confirmedDomain !== null && domain === confirmedDomain && reason === null,
    };
  });
  const selectable = options.filter((option) => option.selectable);
  // Sin dominio confirmado, se recomienda la única opción posible.
  if (!confirmedDomain && selectable.length === 1) selectable[0].recommended = true;
  return options;
}

export function optionsForAnalytics(data: unknown): SelectionOption[] {
  const summaries =
    findArray(data, (item) => Array.isArray(item.propertySummaries) || Array.isArray(item.property_summaries)) ?? [];
  const options: SelectionOption[] = [];
  for (const account of summaries) {
    const accountName = str(account.displayName) ?? str(account.display_name);
    const accountId = (str(account.account) ?? str(account.name) ?? "").replace(/^accounts\//, "");
    const properties = (account.propertySummaries ?? account.property_summaries) as unknown[];
    for (const raw of properties) {
      if (!isObject(raw)) continue;
      const property = str(raw.property);
      const propertyId = property ? property.replace(/^properties\//, "") : null;
      if (!propertyId) continue;
      options.push({
        id: propertyId,
        label: str(raw.displayName) ?? str(raw.display_name) ?? propertyId,
        // Dos cuentas pueden llamarse igual (pasa en la práctica): los números las distinguen.
        detail: [accountName, accountId ? `cuenta ${accountId}` : null, `propiedad ${propertyId}`]
          .filter(Boolean)
          .join(" · "),
        selectable: true,
        reason: null,
        recommended: false,
      });
    }
  }
  if (options.length === 1) options[0].recommended = true;
  return options;
}

export function optionsForFacebook(data: unknown): SelectionOption[] {
  // Composio incluye tokens de acceso en esta respuesta: aquí solo se toman id y nombre.
  const pages = findArray(data, (item) => typeof item.id === "string" && typeof item.name === "string") ?? [];
  const options = pages.map((page): SelectionOption => ({
    id: String(page.id),
    label: String(page.name),
    // El código de la Página distingue Páginas con nombres parecidos.
    detail: [str(page.category), `código de la Página ${String(page.id)}`].filter(Boolean).join(" · "),
    selectable: true,
    reason: null,
    recommended: false,
  }));
  if (options.length === 1) options[0].recommended = true;
  return options;
}

export function optionsForInstagram(data: unknown): SelectionOption[] {
  const candidates: Json[] = [];
  const collect = (value: unknown, depth: number) => {
    if (!isObject(value) || depth > 3) return;
    if (typeof value.id === "string" && (typeof value.username === "string" || typeof value.name === "string")) {
      candidates.push(value);
      return;
    }
    Object.values(value).forEach((inner) => collect(inner, depth + 1));
  };
  collect(data, 0);
  const seen = new Set<string>();
  const options: SelectionOption[] = [];
  for (const account of candidates) {
    const id = String(account.id);
    if (seen.has(id)) continue;
    seen.add(id);
    const username = str(account.username);
    options.push({
      id,
      label: username ? `@${username}` : (str(account.name) ?? id),
      detail: [str(account.name) && username ? String(account.name) : null, `código de la cuenta ${id}`]
        .filter(Boolean)
        .join(" · "),
      selectable: true,
      reason: null,
      recommended: false,
    });
  }
  if (options.length === 1) options[0].recommended = true;
  return options;
}

export function buildOptions(
  app: ComposioAppId,
  data: unknown,
  ctx: { confirmedDomain: string | null },
): SelectionOption[] {
  switch (app) {
    case "google_search_console":
      return optionsForSearchConsole(data, ctx.confirmedDomain);
    case "google_analytics":
      return optionsForAnalytics(data);
    case "facebook":
      return optionsForFacebook(data);
    case "instagram":
      return optionsForInstagram(data);
  }
}

export interface AnalyticsTraffic {
  hosts: string[];
  users: number;
}

/**
 * Resume un informe de Analytics (dimensión hostName, métrica activeUsers) en
 * los sitios que envían visitas y el total de usuarios. Forma de la API de datos
 * de Google: rows[].dimensionValues[].value / metricValues[].value.
 */
export function summarizeAnalyticsReport(data: unknown): AnalyticsTraffic {
  const rows = findArray(data, (item) => Array.isArray(item.dimensionValues) || Array.isArray(item.metricValues)) ?? [];
  const hosts: string[] = [];
  let users = 0;
  for (const row of rows) {
    const dimension = Array.isArray(row.dimensionValues) ? row.dimensionValues[0] : null;
    const metric = Array.isArray(row.metricValues) ? row.metricValues[0] : null;
    const host = isObject(dimension) ? str(dimension.value) : null;
    const count = isObject(metric) ? Number(metric.value) : NaN;
    if (host && host !== "(not set)") hosts.push(host);
    if (Number.isFinite(count)) users += count;
  }
  return { hosts, users };
}

/** Añade a cada propiedad de qué sitio recibe visitas y recomienda la que corresponde. */
export function applyAnalyticsTraffic(
  options: SelectionOption[],
  traffic: Record<string, AnalyticsTraffic | null>,
  confirmedDomain: string | null,
): SelectionOption[] {
  const enriched = options.map((option) => {
    const t = traffic[option.id];
    const hint = !t
      ? "no se pudo leer su tráfico"
      : t.users === 0
        ? "sin visitas en los últimos 90 días"
        : `recibe visitas de ${t.hosts.slice(0, 3).join(", ") || "sitios sin nombre"} (${t.users} usuarios en 90 días)`;
    const matches = !!t && !!confirmedDomain && t.hosts.some((host) => normalizeDomain(host) === confirmedDomain);
    return { option: { ...option, detail: [option.detail, hint].filter(Boolean).join(" · ") }, matches, users: t?.users ?? 0 };
  });
  let recommendedId: string | null = null;
  const matching = enriched.filter((item) => item.matches);
  if (matching.length === 1) recommendedId = matching[0].option.id;
  else if (!confirmedDomain) {
    const withTraffic = enriched.filter((item) => item.users > 0);
    if (withTraffic.length === 1) recommendedId = withTraffic[0].option.id;
  }
  return enriched.map(({ option }) => ({ ...option, recommended: option.id === recommendedId }));
}

/**
 * Continuidad con la conexión propia: si la cuenta ya usa hoy un sitio o una
 * propiedad concreta, esa es la recomendada (y se dice por qué). Solo recomienda;
 * la persona sigue eligiendo y aprobando.
 */
export function markCurrentSelection(options: SelectionOption[], currentId: string | null): SelectionOption[] {
  if (!currentId) return options;
  const normalize = (value: string) => value.replace(/\/$/, "").toLowerCase();
  const match = options.find((option) => option.selectable && normalize(option.id) === normalize(currentId));
  if (!match) return options;
  return options.map((option) =>
    option.id === match.id
      ? { ...option, recommended: true, detail: [option.detail, "es el que usas hoy en tu conexión actual"].filter(Boolean).join(" · ") }
      : { ...option, recommended: false },
  );
}

export interface SearchConsoleStats {
  clicks: number;
  impressions: number;
}

/** Resume una consulta de Search Console sin dimensiones: total de clics e impresiones. */
export function summarizeSearchConsoleQuery(data: unknown): SearchConsoleStats {
  const rows = findArray(data, (item) => "clicks" in item || "impressions" in item) ?? [];
  let clicks = 0;
  let impressions = 0;
  for (const row of rows) {
    if (Number.isFinite(Number(row.clicks))) clicks += Number(row.clicks);
    if (Number.isFinite(Number(row.impressions))) impressions += Number(row.impressions);
  }
  return { clicks, impressions };
}

/** Añade a cada sitio su actividad de los últimos 28 días para poder reconocerlo. */
export function applySearchConsoleStats(
  options: SelectionOption[],
  stats: Record<string, SearchConsoleStats | null>,
): SelectionOption[] {
  return options.map((option) => {
    if (!option.selectable) return option;
    const t = stats[option.id];
    const hint = !t
      ? "no se pudo leer su actividad"
      : t.impressions === 0 && t.clicks === 0
        ? "sin actividad en 28 días"
        : `28 días: ${t.clicks} clics · ${t.impressions} impresiones`;
    return { ...option, detail: [option.detail, hint].filter(Boolean).join(" · ") };
  });
}
