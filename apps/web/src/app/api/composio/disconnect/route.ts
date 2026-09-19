import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { disconnectApp } from "@/lib/composio-connections";
import { NO_STORE, errorResponse, forbidden, getComposioUser, readJson } from "../_access";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getComposioUser();
  if (!user) return forbidden();
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });

  try {
    await disconnectApp(user, body.app);
    auditLog("composio.disconnected", user.id, { app: body.app });
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
