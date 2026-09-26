import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { startPostPeerBusinessConnection } from "@/lib/postpeer";
import { connectionReturnPath } from "@/lib/connection-return";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const callback = new URL("/api/postpeer/callback", request.nextUrl.origin);
  callback.searchParams.set("returnTo", "/dashboard/configuracion/conexiones?conexion=business-profile&vista=difusion");
  try {
    return NextResponse.redirect(await startPostPeerBusinessConnection(user.id, callback.toString()));
  } catch (error) {
    console.error("PostPeer: no se pudo iniciar la conexión de Google Business Profile:", error);
    return NextResponse.redirect(new URL(connectionReturnPath("business-profile", "error"), request.nextUrl.origin));
  }
}
