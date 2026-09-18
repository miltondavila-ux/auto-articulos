import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { auditLog } from "@/lib/audit";
import {
  COMPOSIO_APPS,
  COMPOSIO_CLI_INSTALL,
  COMPOSIO_MCP_URL,
  deleteAllAuthConfigIds,
  deleteComposioApiKey,
  getStoredAuthConfigIds,
  getStoredComposioApiKey,
  isPlausibleComposioApiKey,
  maskComposioApiKey,
  saveComposioApiKey,
  verifyComposioApiKey,
} from "@/lib/composio";

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

/**
 * Estado de la conexión. Con `?verify=1` además comprueba la clave contra
 * Composio; sin eso solo dice si hay una clave guardada, sin salir a la red.
 */
export async function GET(request: NextRequest) {
  if (!(await adminIdOrNull())) return unauthorized();

  const info = {
    mcpUrl: COMPOSIO_MCP_URL,
    cliInstall: COMPOSIO_CLI_INSTALL,
    apps: COMPOSIO_APPS.map(({ id, label }) => ({ id, label })),
    authConfigs: await getStoredAuthConfigIds(),
  };
  const apiKey = await getStoredComposioApiKey();
  if (!apiKey) {
    return NextResponse.json({ configured: false, ...info }, { headers: NO_STORE });
  }

  const base = { configured: true, maskedKey: maskComposioApiKey(apiKey), ...info };
  if (request.nextUrl.searchParams.get("verify") !== "1") {
    return NextResponse.json(base, { headers: NO_STORE });
  }

  const verification = await verifyComposioApiKey(apiKey);
  return NextResponse.json(
    {
      ...base,
      verification: verification.valid
        ? { valid: true }
        : { valid: false, reason: verification.reason },
    },
    { headers: NO_STORE },
  );
}

/** Guarda la clave, pero solo si Composio la acepta. */
export async function PUT(request: NextRequest) {
  const adminId = await adminIdOrNull();
  if (!adminId) return unauthorized();

  let apiKey: string;
  try {
    const body = await request.json();
    apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  if (!isPlausibleComposioApiKey(apiKey)) {
    return NextResponse.json(
      { error: "La clave de API no es válida: debe tener al menos 10 caracteres y no llevar espacios." },
      { status: 400 },
    );
  }

  const verification = await verifyComposioApiKey(apiKey);
  if (!verification.valid) {
    return NextResponse.json(
      { error: verification.reason },
      { status: verification.status === null ? 502 : 400 },
    );
  }

  const previousKey = await getStoredComposioApiKey();
  await saveComposioApiKey(apiKey);
  // Otro proyecto de Composio: los auth configs anteriores ya no existen allí.
  if (previousKey !== null && previousKey !== apiKey) await deleteAllAuthConfigIds();
  auditLog("composio.api_key_saved", adminId);
  return NextResponse.json(
    { configured: true, maskedKey: maskComposioApiKey(apiKey) },
    { headers: NO_STORE },
  );
}

export async function DELETE() {
  const adminId = await adminIdOrNull();
  if (!adminId) return unauthorized();

  await deleteComposioApiKey();
  await deleteAllAuthConfigIds();
  auditLog("composio.api_key_deleted", adminId);
  return NextResponse.json({ configured: false }, { headers: NO_STORE });
}
