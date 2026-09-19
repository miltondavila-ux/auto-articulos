import { prisma } from "@auto-articulos/db";
import {
  COMPOSIO_TEST_TOOL,
  ComposioApiError,
  createConnectLink,
  deleteConnectedAccount,
  getConnectedAccount,
  runAllowedTool,
} from "@auto-articulos/shared";
import {
  COMPOSIO_APPS,
  findComposioApp,
  getStoredAuthConfigIds,
  getStoredComposioApiKey,
  type ComposioAppId,
} from "./composio";
import { hasOptInModuleAccess } from "./modules";
import { applyAnalyticsTraffic, applySearchConsoleStats, buildOptions, markCurrentSelection, summarizeAnalyticsReport, summarizeSearchConsoleQuery, type AnalyticsTraffic, type SearchConsoleStats, type SelectionOption } from "./composio-options";
import { normalizeDomain, validateAndRegisterTrialDomain } from "./domain-validation";

/**
 * Conexión de un cliente a una app por Composio (CONEXION COMPOSIO, Fase 2b-1).
 * Solo conecta, comprueba y desconecta: ningún consumidor del sistema lee estas
 * conexiones todavía, así que no cambia cómo funciona nada existente.
 */

export const COMPOSIO_MODULE_ID = "conexion-composio";

export class ConnectionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ConnectionError";
  }
}

export interface ConnectingUser {
  id: string;
  role?: string;
  disabledModules?: string | null;
  allowFacebookPublishing?: boolean;
  allowInstagramPublishing?: boolean;
}

/** Acceso al módulo: administradores y quien tenga «Habilitado». */
export function canUseComposioModule(user: ConnectingUser): boolean {
  return hasOptInModuleAccess(user, COMPOSIO_MODULE_ID);
}

/** Facebook e Instagram respetan el mismo permiso por usuario que ya existe. */
export function userMayConnectApp(user: ConnectingUser, app: ComposioAppId): boolean {
  if (app === "facebook") return user.allowFacebookPublishing === true;
  if (app === "instagram") return user.allowInstagramPublishing === true;
  return true;
}

function requireApp(appId: unknown, user: ConnectingUser): ComposioAppId {
  const app = findComposioApp(appId);
  if (!app) throw new ConnectionError("App desconocida.", 400);
  if (!userMayConnectApp(user, app.id)) {
    throw new ConnectionError("Tu cuenta no tiene habilitada esta red social.", 403);
  }
  return app.id;
}

async function requireSetup(app: ComposioAppId): Promise<{ apiKey: string; authConfigId: string }> {
  const [apiKey, authConfigs] = await Promise.all([getStoredComposioApiKey(), getStoredAuthConfigIds()]);
  const authConfigId = authConfigs[app];
  if (!apiKey || !authConfigId) {
    throw new ConnectionError("La conexión por Composio aún no está configurada. Avisa al administrador.", 409);
  }
  return { apiKey, authConfigId };
}

function toConnectionError(error: unknown): never {
  if (error instanceof ConnectionError) throw error;
  if (error instanceof ComposioApiError) {
    if (error.status === 403 || error.status === 401) {
      throw new ConnectionError("Composio rechazó la operación: la clave del sistema no tiene los permisos necesarios.", 502);
    }
    throw new ConnectionError(error.message, error.status === 429 ? 429 : 502);
  }
  throw error;
}

export interface UserConnectionView {
  app: ComposioAppId;
  label: string;
  status: "NOT_CONNECTED" | "INITIATED" | "ACTIVE" | "FAILED" | "REVOKED";
  activatedAt: string | null;
  /** Lo que la persona eligió (sitio, propiedad, Página o cuenta); null si aún no eligió. */
  selection: string | null;
  available: boolean;
  unavailableReason: string | null;
}

interface SelectionFields {
  siteUrl: string | null;
  propertyId: string | null;
  pageId: string | null;
  pageName: string | null;
  igAccountId: string | null;
  username: string | null;
}

function selectionLabel(app: ComposioAppId, row: SelectionFields): string | null {
  switch (app) {
    case "google_search_console":
      return row.siteUrl;
    case "google_analytics":
      return row.propertyId ? `Propiedad ${row.propertyId}` : null;
    case "facebook":
      return row.pageId ? (row.pageName ?? row.pageId) : null;
    case "instagram":
      return row.igAccountId ? (row.username ? `@${row.username}` : row.igAccountId) : null;
  }
}

/** Estado de las 4 apps para el cliente; no llama a Composio. */
export async function listUserConnections(user: ConnectingUser): Promise<UserConnectionView[]> {
  const [rows, apiKey, authConfigs] = await Promise.all([
    prisma.composioConnection.findMany({ where: { userId: user.id, siteDomain: "" } }),
    getStoredComposioApiKey(),
    getStoredAuthConfigIds(),
  ]);
  return COMPOSIO_APPS.map((app) => {
    const row = rows.find((r) => r.app === app.id);
    let unavailableReason: string | null = null;
    if (!apiKey || !authConfigs[app.id]) unavailableReason = "Aún no está configurada por el administrador.";
    else if (!userMayConnectApp(user, app.id)) unavailableReason = "Tu cuenta no tiene habilitada esta red social.";
    return {
      app: app.id,
      label: app.label,
      status: row?.status ?? "NOT_CONNECTED",
      activatedAt: row?.activatedAt ? row.activatedAt.toISOString() : null,
      selection: row ? selectionLabel(app.id, row) : null,
      available: unavailableReason === null,
      unavailableReason,
    };
  });
}

/** Crea el enlace de autorización y deja la conexión en INITIATED. */
export async function startConnection(user: ConnectingUser, appId: unknown, origin: string): Promise<{ redirectUrl: string }> {
  const app = requireApp(appId, user);
  const { apiKey, authConfigId } = await requireSetup(app);

  const existing = await prisma.composioConnection.findUnique({
    where: { userId_app_siteDomain: { userId: user.id, app, siteDomain: "" } },
  });
  if (existing?.status === "ACTIVE") {
    throw new ConnectionError("Esta app ya está conectada. Desconéctala primero si quieres reconectarla.", 409);
  }

  try {
    if (existing) {
      // Intento anterior sin terminar: se descarta su cuenta en Composio.
      await deleteConnectedAccount(apiKey, existing.connectedAccountId).catch(() => undefined);
    }
    const link = await createConnectLink(apiKey, {
      authConfigId,
      userId: user.id,
      callbackUrl: `${origin}/api/composio/callback?app=${encodeURIComponent(app)}`,
    });
    await prisma.composioConnection.upsert({
      where: { userId_app_siteDomain: { userId: user.id, app, siteDomain: "" } },
      create: { userId: user.id, app, connectedAccountId: link.connectedAccountId, status: "INITIATED" },
      update: { connectedAccountId: link.connectedAccountId, status: "INITIATED", activatedAt: null },
    });
    return { redirectUrl: link.redirectUrl };
  } catch (error) {
    return toConnectionError(error);
  }
}

export type CallbackOutcome = "connected" | "failed" | "invalid";

/**
 * Cierra la conexión al volver de Composio. Los parámetros de la URL se pueden
 * falsificar, así que NO se les cree: se busca la conexión INITIATED de ESTA
 * persona con ese identificador y se consulta a Composio directamente.
 */
export async function completeConnection(
  user: ConnectingUser,
  appId: unknown,
  connectedAccountId: unknown,
): Promise<CallbackOutcome> {
  const app = findComposioApp(appId)?.id;
  if (!app || typeof connectedAccountId !== "string" || connectedAccountId.length === 0) return "invalid";

  const row = await prisma.composioConnection.findFirst({
    where: { userId: user.id, app, connectedAccountId, status: "INITIATED" },
  });
  if (!row) return "invalid";

  const apiKey = await getStoredComposioApiKey();
  if (!apiKey) return "failed";

  try {
    const account = await getConnectedAccount(apiKey, connectedAccountId);
    const toolkit = findComposioApp(app)!.toolkit;
    const valid =
      account.status === "ACTIVE" &&
      account.userId === user.id &&
      (account.toolkitSlug ?? "").toLowerCase() === toolkit;
    await prisma.composioConnection.update({
      where: { id: row.id },
      data: valid ? { status: "ACTIVE", activatedAt: new Date() } : { status: "FAILED" },
    });
    return valid ? "connected" : "failed";
  } catch {
    await prisma.composioConnection.update({ where: { id: row.id }, data: { status: "FAILED" } });
    return "failed";
  }
}

/** Borra la cuenta en Composio y la fila. Si Composio falla, no borra la fila. */
export async function disconnectApp(user: ConnectingUser, appId: unknown): Promise<void> {
  const app = requireApp(appId, user);
  const row = await prisma.composioConnection.findUnique({
    where: { userId_app_siteDomain: { userId: user.id, app, siteDomain: "" } },
  });
  if (!row) return;
  const apiKey = await getStoredComposioApiKey();
  if (apiKey) {
    try {
      await deleteConnectedAccount(apiKey, row.connectedAccountId);
    } catch (error) {
      // 404: ya no existe en Composio, se puede limpiar la fila.
      if (!(error instanceof ComposioApiError && error.status === 404)) return toConnectionError(error);
    }
  }
  await prisma.composioConnection.delete({ where: { id: row.id } });
}

function summarize(data: unknown): { items: number | null; fields: string[] } {
  const seen = new Set<unknown>();
  const walk = (value: unknown, depth: number): unknown[] | null => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object" || depth > 3 || seen.has(value)) return null;
    seen.add(value);
    for (const inner of Object.values(value as Record<string, unknown>)) {
      const found = walk(inner, depth + 1);
      if (found) return found;
    }
    return null;
  };
  const list = walk(data, 0);
  return {
    items: list ? list.length : null,
    fields: data && typeof data === "object" ? Object.keys(data as Record<string, unknown>).slice(0, 8) : [],
  };
}

/** Ejecuta la herramienta de LECTURA de la app con la cuenta conectada. No devuelve datos crudos. */
export async function testConnectedApp(user: ConnectingUser, appId: unknown) {
  const app = requireApp(appId, user);
  const { apiKey } = await requireSetup(app);
  const row = await prisma.composioConnection.findUnique({
    where: { userId_app_siteDomain: { userId: user.id, app, siteDomain: "" } },
  });
  if (!row || row.status !== "ACTIVE") throw new ConnectionError("Esta app no está conectada.", 409);
  try {
    const result = await runAllowedTool(apiKey, {
      app,
      userId: user.id,
      connectedAccountId: row.connectedAccountId,
      toolSlug: COMPOSIO_TEST_TOOL[app],
    });
    const found = buildOptions(app, result.data, { confirmedDomain: null })
      .slice(0, 6)
      .map((option) => ({ label: option.label, detail: option.detail }));
    return { ok: true as const, tool: COMPOSIO_TEST_TOOL[app], ...summarize(result.data), found };
  } catch (error) {
    return toConnectionError(error);
  }
}

async function activeRowFor(user: ConnectingUser, app: ComposioAppId) {
  const row = await prisma.composioConnection.findUnique({
    where: { userId_app_siteDomain: { userId: user.id, app, siteDomain: "" } },
  });
  if (!row || row.status !== "ACTIVE") throw new ConnectionError("Esta app no está conectada.", 409);
  return row;
}

async function confirmedDomainOf(userId: string): Promise<string | null> {
  const found = await prisma.user.findUnique({ where: { id: userId }, select: { selectedSiteDomain: true } });
  const domain = found?.selectedSiteDomain ? normalizeDomain(found.selectedSiteDomain) : "";
  return domain || null;
}

/** Opciones REALES de la cuenta conectada (lectura en vivo). Nunca devuelve tokens. */
export async function getSelectionOptions(
  user: ConnectingUser,
  appId: unknown,
): Promise<{ options: SelectionOption[]; selected: string | null }> {
  const app = requireApp(appId, user);
  const { apiKey } = await requireSetup(app);
  const row = await activeRowFor(user, app);
  try {
    const result = await runAllowedTool(apiKey, {
      app,
      userId: user.id,
      connectedAccountId: row.connectedAccountId,
      toolSlug: COMPOSIO_TEST_TOOL[app],
    });
    const confirmedDomain = await confirmedDomainOf(user.id);
    let options = buildOptions(app, result.data, { confirmedDomain });
    if (app === "google_analytics" && options.length > 1) {
      // Varias propiedades pueden llamarse igual: se lee de qué sitio recibe visitas cada una.
      const traffic: Record<string, AnalyticsTraffic | null> = {};
      await Promise.all(
        options.slice(0, 8).map(async (option) => {
          try {
            const report = await runAllowedTool(apiKey, {
              app,
              userId: user.id,
              connectedAccountId: row.connectedAccountId,
              toolSlug: "GOOGLE_ANALYTICS_RUN_REPORT",
              args: {
                property: `properties/${option.id}`,
                dateRanges: [{ startDate: "90daysAgo", endDate: "today" }],
                dimensions: [{ name: "hostName" }],
                metrics: [{ name: "activeUsers" }],
                limit: 5,
              },
            });
            traffic[option.id] = summarizeAnalyticsReport(report.data);
          } catch {
            traffic[option.id] = null;
          }
        }),
      );
      options = applyAnalyticsTraffic(options, traffic, confirmedDomain);
    }
    if (app === "google_search_console" && options.length > 0) {
      // Un mismo Google puede tener varios sitios: se lee la actividad de cada uno para reconocerlos.
      const dayAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      const stats: Record<string, SearchConsoleStats | null> = {};
      await Promise.all(
        options
          .filter((option) => option.selectable)
          .slice(0, 8)
          .map(async (option) => {
            try {
              const report = await runAllowedTool(apiKey, {
                app,
                userId: user.id,
                connectedAccountId: row.connectedAccountId,
                toolSlug: "GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY",
                args: { site_url: option.id, start_date: dayAgo(31), end_date: dayAgo(3) },
              });
              stats[option.id] = summarizeSearchConsoleQuery(report.data);
            } catch {
              stats[option.id] = null;
            }
          }),
      );
      options = applySearchConsoleStats(options, stats);
    }
    // Continuidad: si esta cuenta ya usa hoy un sitio o una propiedad por la vía propia, se recomienda esa.
    if (app === "google_search_console" || app === "google_analytics") {
      const own = await prisma.searchIntegration.findFirst({
        where: { userId: user.id, provider: app === "google_search_console" ? "google" : "google-analytics", siteUrl: { not: null } },
        select: { siteUrl: true },
      });
      options = markCurrentSelection(options, own?.siteUrl ?? null);
    }
    return { options, selected: selectionLabel(app, row) };
  } catch (error) {
    return toConnectionError(error);
  }
}

/**
 * Guarda lo que la persona aprobó. La elección se vuelve a validar contra la
 * lectura en vivo de Google/Meta: solo vale una opción real y elegible.
 */
export async function saveSelection(user: ConnectingUser, appId: unknown, optionId: unknown): Promise<void> {
  const app = requireApp(appId, user);
  if (typeof optionId !== "string" || optionId === "") throw new ConnectionError("Elige una opción.", 400);
  const { options } = await getSelectionOptions(user, app);
  const chosen = options.find((option) => option.id === optionId);
  if (!chosen) throw new ConnectionError("Esa opción no existe en tu cuenta. Vuelve a cargar la lista.", 400);
  if (!chosen.selectable) throw new ConnectionError(chosen.reason ?? "No puedes elegir esa opción.", 400);

  const row = await activeRowFor(user, app);
  let data: Record<string, string | null>;
  switch (app) {
    case "google_search_console": {
      // Misma validación antifraude de dominios que la vía propia (cuentas de prueba).
      const trial = await validateAndRegisterTrialDomain(user.id, chosen.id);
      if (!trial.ok) throw new ConnectionError(trial.error ?? "Dominio no permitido.", 400);
      data = { siteUrl: chosen.id };
      break;
    }
    case "google_analytics":
      data = { propertyId: chosen.id };
      break;
    case "facebook":
      data = { pageId: chosen.id, pageName: chosen.label };
      break;
    case "instagram":
      data = { igAccountId: chosen.id, username: chosen.label.replace(/^@/, "") };
      break;
  }
  await prisma.composioConnection.update({ where: { id: row.id }, data });
}
