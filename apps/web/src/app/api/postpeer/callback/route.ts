import { NextRequest, NextResponse } from "next/server";
import { completePostPeerBusinessConnection } from "@/lib/postpeer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get("profileId");
  const result = profileId ? await completePostPeerBusinessConnection(profileId) : "missing";
  const target = new URL("/dashboard/configuracion/redes-sociales", request.nextUrl.origin);
  target.searchParams.set("postpeer", result);
  return NextResponse.redirect(target);
}
