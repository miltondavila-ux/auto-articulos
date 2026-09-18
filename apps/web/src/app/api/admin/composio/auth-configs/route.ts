import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { auditLog } from "@/lib/audit";
import {
  deleteAuthConfigId,
  findComposioApp,
  getStoredComposioApiKey,
  isPlausibleAuthConfigId,
  saveAuthConfigId,
  verifyAuthConfig,
} from "@/lib/composio";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" };

/**
 * Guarda el auth config de una app (el que el admin crea una vez en el panel
 * de Composio con OAuth administrado). Se valida contra Composio antes de
 * guardarlo. Con `authConfigId` vacío se elimina.
 */
export async function PUT(request: NextRequest) {
  let adminId: string;
  try {
    adminId = (await requireAdmin()).id;
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403, headers: NO_STORE });
  }

  let body: { app?: unknown; authConfigId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const app = findComposioApp(body.app);
  if (!app) {
    return NextResponse.json({ error: "App desconocida." }, { status: 400 });
  }
  const authConfigId = typeof body.authConfigId === "string" ? body.authConfigId.trim() : "";

  if (authConfigId === "") {
    await deleteAuthConfigId(app.id);
    auditLog("composio.auth_config_deleted", adminId, { app: app.id });
    return NextResponse.json({ app: app.id, authConfigId: null }, { headers: NO_STORE });
  }

  if (!isPlausibleAuthConfigId(authConfigId)) {
    return NextResponse.json(
      { error: "El identificador no es válido. Debe empezar por \"ac_\" (cópialo de Platform → Auth Configs)." },
      { status: 400 },
    );
  }

  const apiKey = await getStoredComposioApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Primero guarda la clave de API de Composio." },
      { status: 409, headers: NO_STORE },
    );
  }

  const verification = await verifyAuthConfig(apiKey, app.id, authConfigId);
  if (!verification.valid) {
    return NextResponse.json(
      { error: verification.reason },
      { status: verification.status === null ? 502 : 400, headers: NO_STORE },
    );
  }

  await saveAuthConfigId(app.id, authConfigId);
  auditLog("composio.auth_config_saved", adminId, { app: app.id });
  return NextResponse.json({ app: app.id, authConfigId }, { headers: NO_STORE });
}
