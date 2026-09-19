import { NextRequest, NextResponse } from "next/server";
import { testConnectedApp } from "@/lib/composio-connections";
import { NO_STORE, errorResponse, forbidden, getComposioUser, readJson } from "../_access";

export const dynamic = "force-dynamic";

/** «Probar conexión»: ejecuta una herramienta de solo lectura de la lista blanca. */
export async function POST(request: NextRequest) {
  const user = await getComposioUser();
  if (!user) return forbidden();
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });

  try {
    return NextResponse.json(await testConnectedApp(user, body.app), { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
