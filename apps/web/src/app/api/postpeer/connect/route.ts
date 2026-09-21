import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { startPostPeerBusinessConnection } from "@/lib/postpeer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const callback = new URL("/api/postpeer/callback", request.nextUrl.origin);
  callback.searchParams.set("returnTo", "/dashboard/configuracion/redes-sociales");
  try {
    return NextResponse.redirect(await startPostPeerBusinessConnection(user.id, callback.toString()));
  } catch (error) {
    const target = new URL("/dashboard/configuracion/redes-sociales", request.nextUrl.origin);
    target.searchParams.set("postpeer", "error");
    target.searchParams.set("mensaje", error instanceof Error ? error.message : "No se pudo iniciar la conexión.");
    return NextResponse.redirect(target);
  }
}
