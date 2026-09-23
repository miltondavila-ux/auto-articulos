import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { ConnectionError, canUseComposioModule, type ConnectingUser } from "@/lib/composio-connections";

export const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" };

const MIGRATION_APPS = new Set(["google_search_console", "google_analytics"]);

/**
 * Persona con acceso pleno al módulo Composio. Se conserva para acciones que
 * no forman parte de la migración GSC, incluyendo desconexiones y redes Meta.
 */
export async function getComposioUser(): Promise<ConnectingUser | null> {
  const user = await getCurrentUser();
  return canUseComposioModule(user) ? user : null;
}

/**
 * Estado de Conexiones: todas las cuentas activas pueden verlo para completar
 * la migración de Google Search Console.
 */
export async function getComposioStatusUser(): Promise<ConnectingUser | null> {
  return getCurrentUser();
}

/**
 * Acciones de conexión: GSC/Analytics quedan abiertas para la migración;
 * Facebook/Instagram conservan el opt-in y sus permisos propios.
 */
export async function getComposioUserForApp(app: unknown): Promise<ConnectingUser | null> {
  const user = await getCurrentUser();
  if (typeof app === "string" && MIGRATION_APPS.has(app)) return user;
  return canUseComposioModule(user) ? user : null;
}

export function forbidden() {
  return NextResponse.json({ error: "No autorizado" }, { status: 403, headers: NO_STORE });
}

export function errorResponse(error: unknown) {
  if (error instanceof ConnectionError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: NO_STORE });
  }
  throw error;
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
