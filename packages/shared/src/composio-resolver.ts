import type { ComposioAppId } from "./composio";

/**
 * Resolvedor de conexión (CONEXION COMPOSIO, Fase 2b-2; ver
 * ESPECIFICACION_CONEXIONES_UNIFICADAS.md §6). Lógica PURA: decide qué conexión debe usar el
 * sistema para una persona y una app. No lee la base de datos ni cambia nada por sí sola.
 *
 * Reglas:
 * - Método OWN (el de siempre): se usa la conexión propia si existe.
 * - Método COMPOSIO: se usa la conexión de Composio si está ACTIVA y con su elección aprobada. Si aún
 *   no reconectó, NO se usa la propia: la red queda desconectada (decisión de Milton, P2). La conexión
 *   propia no se borra: sigue guardada para poder revertir el switch.
 * - Mientras un consumidor no esté listo para Composio (COMPOSIO_CONSUMER_READY), el método es
 *   SIEMPRE OWN: ninguna persona cambia de vía por habilitar el módulo o mover el interruptor.
 */

/**
 * Se pone en true, app por app, SOLO cuando todos los consumidores de esa app saben usar Composio
 * (etapas 2b-2, 2b-3 y 2b-4) y ya se probó con cuentas piloto reales.
 */
export const COMPOSIO_CONSUMER_READY: Record<ComposioAppId, boolean> = {
  google_search_console: false,
  google_analytics: false,
  facebook: false,
  instagram: false,
};

/** Piloto aislado: permite probar una app con usuarios concretos sin activar la vía global. */
function pilotUserIds(app: ComposioAppId): Set<string> {
  const raw = process.env[`COMPOSIO_PILOT_USERS_${app.toUpperCase()}`] ?? "";
  return new Set(raw.split(",").map((id) => id.trim()).filter(Boolean));
}

export type ConnectionMethod = "OWN" | "COMPOSIO";
export type ConnectionSource = "OWN" | "COMPOSIO" | "NONE";
export type NoConnectionReason = "RECONNECT_REQUIRED" | "NOT_CONNECTED";

/** Método de conexión de una persona para una app. */
export function methodFor(input: {
  app: ComposioAppId;
  userId?: string;
  /** La persona tiene «Habilitado» el módulo «Conexión por Composio». */
  moduleEnabled: boolean;
  /** El interruptor global de esa app está en COMPOSIO. */
  routeIsComposio: boolean;
}): ConnectionMethod {
  if (!COMPOSIO_CONSUMER_READY[input.app] && !(input.userId && pilotUserIds(input.app).has(input.userId))) return "OWN";
  return input.routeIsComposio || input.moduleEnabled ? "COMPOSIO" : "OWN";
}

export interface ComposioConnectionState {
  status: string;
  /** La persona ya eligió y aprobó su sitio / propiedad / Página / cuenta. */
  hasSelection: boolean;
}

export interface ResolvedConnection {
  source: ConnectionSource;
  reason?: NoConnectionReason;
}

/** Qué conexión debe usar el sistema ahora mismo. */
export function resolveConnection(input: {
  method: ConnectionMethod;
  /** Existe una conexión propia (la de siempre). */
  hasOwn: boolean;
  composio: ComposioConnectionState | null;
}): ResolvedConnection {
  if (input.method === "OWN") {
    return input.hasOwn ? { source: "OWN" } : { source: "NONE", reason: "NOT_CONNECTED" };
  }
  if (input.composio && input.composio.status === "ACTIVE" && input.composio.hasSelection) {
    return { source: "COMPOSIO" };
  }
  // Método Composio sin conexión utilizable: la propia queda ignorada, guardada y reversible.
  return { source: "NONE", reason: input.hasOwn ? "RECONNECT_REQUIRED" : "NOT_CONNECTED" };
}

/**
 * Alerta del HOME: SOLO Google Search Console (la única conexión esencial). Aparece cuando la
 * persona pasó a Composio, tenía la conexión propia y aún no reconectó; desaparece sola al reconectar.
 */
export function needsReconnectAlert(input: {
  app: ComposioAppId;
  method: ConnectionMethod;
  hasOwn: boolean;
  composio: ComposioConnectionState | null;
}): boolean {
  if (input.app !== "google_search_console") return false;
  const resolved = resolveConnection(input);
  return resolved.source === "NONE" && resolved.reason === "RECONNECT_REQUIRED";
}
