import { prisma } from "@auto-articulos/db";
import { COMPOSIO_APPS, type ComposioAppId } from "./composio";

/**
 * Vía de conexión por app (CONEXION COMPOSIO, Fase 2a; ver
 * FASE_0_ARQUITECTURA_CONEXION_COMPOSIO.md §3 y §6).
 *
 * Reglas de seguridad de este archivo:
 * - Sin fila en IntegrationRoute (o con la tabla aún sin migrar en la base de
 *   datos) la vía es siempre OWN, la de siempre. Nunca lanza por eso.
 * - Mientras COMPOSIO_ROUTING_ENABLED sea false, resolveRoute() devuelve OWN
 *   pase lo que pase: ningún cliente cambia de vía hasta la Fase 2b.
 * - No lee ni modifica ninguna integración existente salvo para CONTAR clientes.
 */

/** Se pone en true en la Fase 2b, junto con el flujo de conexión de clientes. */
export const COMPOSIO_ROUTING_ENABLED = false;

export type RouteMode = "OWN" | "COMPOSIO";

/** P2021: la tabla no existe en la base de datos (migración aún sin aplicar). */
export function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2021"
  );
}

function allOwn(): Record<ComposioAppId, RouteMode> {
  return Object.fromEntries(COMPOSIO_APPS.map((app) => [app.id, "OWN"])) as Record<
    ComposioAppId,
    RouteMode
  >;
}

export async function getIntegrationRoutes(): Promise<{
  tablesReady: boolean;
  routes: Record<ComposioAppId, RouteMode>;
}> {
  const routes = allOwn();
  try {
    const rows = await prisma.integrationRoute.findMany();
    for (const row of rows) {
      if (row.app in routes && row.route === "COMPOSIO") {
        routes[row.app as ComposioAppId] = "COMPOSIO";
      }
    }
    return { tablesReady: true, routes };
  } catch (error) {
    if (isMissingTableError(error)) return { tablesReady: false, routes };
    throw error;
  }
}

/**
 * Vía que debe usar una app. Es la función que llamarán los consumidores en la
 * Fase 2b. Ante cualquier fallo devuelve OWN: la vía propia nunca se rompe.
 */
export async function resolveRoute(app: ComposioAppId): Promise<RouteMode> {
  if (!COMPOSIO_ROUTING_ENABLED) return "OWN";
  try {
    const { routes } = await getIntegrationRoutes();
    return routes[app];
  } catch {
    return "OWN";
  }
}

export class RouteChangeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RouteChangeError";
  }
}

/**
 * Guarda el interruptor. Pasar a COMPOSIO exige que el enrutamiento esté
 * habilitado, que las tablas existan y que la clave y el auth config de la app
 * estén guardados; volver a OWN siempre se permite.
 */
export async function setIntegrationRoute(
  app: ComposioAppId,
  route: RouteMode,
  adminId: string,
  prerequisites: { hasApiKey: boolean; hasAuthConfig: boolean },
): Promise<void> {
  if (route === "COMPOSIO") {
    if (!COMPOSIO_ROUTING_ENABLED) {
      throw new RouteChangeError(
        "Todavía no disponible: el cambio de vía para clientes llega con la Fase 2b.",
        409,
      );
    }
    if (!prerequisites.hasApiKey) {
      throw new RouteChangeError("Primero guarda la clave de API de Composio.", 409);
    }
    if (!prerequisites.hasAuthConfig) {
      throw new RouteChangeError("Primero guarda el auth config de esta app.", 409);
    }
  }
  try {
    await prisma.integrationRoute.upsert({
      where: { app },
      create: { app, route, updatedById: adminId },
      update: { route, updatedById: adminId },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      // Volver a OWN sin tabla no hay nada que guardar: ya es OWN.
      if (route === "OWN") return;
      throw new RouteChangeError(
        "Falta aplicar la migración de base de datos de CONEXION COMPOSIO.",
        409,
      );
    }
    throw error;
  }
}

export interface AppRouteSummary {
  id: ComposioAppId;
  label: string;
  route: RouteMode;
  /** Clientes conectados por la vía propia. */
  own: number;
  /** Clientes con conexión Composio activa. */
  composio: number;
  /** Con el interruptor en COMPOSIO: clientes con conexión propia y sin Composio activa. */
  pending: number;
}

async function ownUserIds(app: ComposioAppId): Promise<Set<string>> {
  switch (app) {
    case "google_search_console":
      return new Set(
        (await prisma.searchIntegration.findMany({
          where: { provider: "google" },
          select: { userId: true },
        })).map((row) => row.userId),
      );
    case "google_analytics":
      return new Set(
        (await prisma.searchIntegration.findMany({
          where: { provider: "google-analytics" },
          select: { userId: true },
        })).map((row) => row.userId),
      );
    case "facebook":
      return new Set(
        (await prisma.facebookPageIntegration.findMany({ select: { userId: true } })).map(
          (row) => row.userId,
        ),
      );
    case "instagram":
      return new Set(
        (await prisma.instagramIntegration.findMany({ select: { userId: true } })).map(
          (row) => row.userId,
        ),
      );
  }
}

async function activeComposioUserIds(): Promise<{ tablesReady: boolean; byApp: Map<string, Set<string>> }> {
  const byApp = new Map<string, Set<string>>();
  try {
    const rows = await prisma.composioConnection.findMany({
      where: { status: "ACTIVE" },
      select: { userId: true, app: true },
    });
    for (const row of rows) {
      const users = byApp.get(row.app) ?? new Set<string>();
      users.add(row.userId);
      byApp.set(row.app, users);
    }
    return { tablesReady: true, byApp };
  } catch (error) {
    if (isMissingTableError(error)) return { tablesReady: false, byApp };
    throw error;
  }
}

/** Resumen por app para Administración. Solo lee; nunca escribe. */
export async function getRouteSummary(): Promise<{
  tablesReady: boolean;
  apps: AppRouteSummary[];
}> {
  const { tablesReady: routesReady, routes } = await getIntegrationRoutes();
  const { tablesReady: connectionsReady, byApp } = await activeComposioUserIds();

  const apps: AppRouteSummary[] = [];
  for (const app of COMPOSIO_APPS) {
    const own = await ownUserIds(app.id);
    const composio = byApp.get(app.id) ?? new Set<string>();
    const route = routes[app.id];
    const pending =
      route === "COMPOSIO" ? [...own].filter((userId) => !composio.has(userId)).length : 0;
    apps.push({ id: app.id, label: app.label, route, own: own.size, composio: composio.size, pending });
  }
  return { tablesReady: routesReady && connectionsReady, apps };
}
