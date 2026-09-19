import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { auditLog } from "@/lib/audit";
import { findComposioApp, getStoredAuthConfigIds, getStoredComposioApiKey } from "@/lib/composio";
import {
  COMPOSIO_ROUTING_ENABLED,
  RouteChangeError,
  getRouteSummary,
  setIntegrationRoute,
  type RouteMode,
} from "@/lib/composio-route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" };

async function adminIdOrNull(): Promise<string | null> {
  try {
    return (await requireAdmin()).id;
  } catch {
    return null;
  }
}

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 403, headers: NO_STORE });
}

/** Interruptor por app y resumen de clientes. Solo lectura. */
export async function GET() {
  if (!(await adminIdOrNull())) return unauthorized();
  const summary = await getRouteSummary();
  return NextResponse.json(
    { routingEnabled: COMPOSIO_ROUTING_ENABLED, ...summary },
    { headers: NO_STORE },
  );
}

/** Cambia la vía de una app. Volver a OWN siempre se permite. */
export async function PUT(request: NextRequest) {
  const adminId = await adminIdOrNull();
  if (!adminId) return unauthorized();

  let body: { app?: unknown; route?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const app = findComposioApp(body.app);
  if (!app) return NextResponse.json({ error: "App desconocida." }, { status: 400 });
  if (body.route !== "OWN" && body.route !== "COMPOSIO") {
    return NextResponse.json({ error: "Vía inválida." }, { status: 400 });
  }
  const route: RouteMode = body.route;

  const [apiKey, authConfigs] = await Promise.all([getStoredComposioApiKey(), getStoredAuthConfigIds()]);

  try {
    await setIntegrationRoute(app.id, route, adminId, {
      hasApiKey: apiKey !== null,
      hasAuthConfig: authConfigs[app.id] !== null,
    });
  } catch (error) {
    if (error instanceof RouteChangeError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: NO_STORE });
    }
    throw error;
  }

  auditLog("composio.route_changed", adminId, { app: app.id, route });
  const summary = await getRouteSummary();
  return NextResponse.json(
    { routingEnabled: COMPOSIO_ROUTING_ENABLED, ...summary },
    { headers: NO_STORE },
  );
}
