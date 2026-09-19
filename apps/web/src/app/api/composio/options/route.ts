import { NextRequest, NextResponse } from "next/server";
import { getSelectionOptions } from "@/lib/composio-connections";
import { NO_STORE, errorResponse, forbidden, getComposioUser } from "../_access";

export const dynamic = "force-dynamic";

/** Sitios, propiedades, Páginas o cuentas reales de la cuenta conectada. */
export async function GET(request: NextRequest) {
  const user = await getComposioUser();
  if (!user) return forbidden();
  try {
    return NextResponse.json(await getSelectionOptions(user, request.nextUrl.searchParams.get("app")), { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
