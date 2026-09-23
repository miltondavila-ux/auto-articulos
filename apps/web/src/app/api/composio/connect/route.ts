import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { startConnection } from "@/lib/composio-connections";
import { NO_STORE, errorResponse, forbidden, getComposioUserForApp, readJson } from "../_access";

export const dynamic = "force-dynamic";

/** Crea el enlace de autorización de Composio y devuelve su URL. */
export async function POST(request: NextRequest) {
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  const user = await getComposioUserForApp(body.app);
  if (!user) return forbidden();

  try {
    const { redirectUrl } = await startConnection(user, body.app, request.nextUrl.origin);
    auditLog("composio.connect_started", user.id, { app: body.app });
    return NextResponse.json({ redirectUrl }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
