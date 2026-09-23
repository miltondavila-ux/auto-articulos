import { NextRequest, NextResponse } from "next/server";
import { testConnectedApp } from "@/lib/composio-connections";
import { NO_STORE, errorResponse, forbidden, getComposioUserForApp, readJson } from "../_access";

export const dynamic = "force-dynamic";

/** «Probar conexión»: ejecuta una herramienta de solo lectura de la lista blanca. */
export async function POST(request: NextRequest) {
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  const user = await getComposioUserForApp(body.app);
  if (!user) return forbidden();

  try {
    return NextResponse.json(await testConnectedApp(user, body.app), { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
