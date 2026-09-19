import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { ConnectionError, canUseComposioModule, type ConnectingUser } from "@/lib/composio-connections";

export const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" };

/**
 * Persona con acceso al módulo «Conexión por Composio» (administradores y quien
 * tenga «Habilitado»). Comprobación del lado servidor: ocultar el menú no basta.
 */
export async function getComposioUser(): Promise<ConnectingUser | null> {
  const user = await getCurrentUser();
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
