import { NextRequest, NextResponse } from "next/server";
import { getSelectionOptions } from "@/lib/composio-connections";
import { NO_STORE, errorResponse, forbidden, getComposioUserForApp } from "../_access";

export const dynamic = "force-dynamic";

/** Sitios, propiedades, Páginas o cuentas reales de la cuenta conectada. */
export async function GET(request: NextRequest) {
  const user = await getComposioUserForApp(request.nextUrl.searchParams.get("app"));
  if (!user) return forbidden();
  try {
    return NextResponse.json(await getSelectionOptions(user, request.nextUrl.searchParams.get("app")), { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
