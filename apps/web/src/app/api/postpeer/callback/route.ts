import { NextRequest, NextResponse } from "next/server";
import { completePostPeerBusinessConnection } from "@/lib/postpeer";
import { connectionReturnPath } from "@/lib/connection-return";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get("profileId");
  const result = profileId ? await completePostPeerBusinessConnection(profileId) : "missing";
  return NextResponse.redirect(new URL(connectionReturnPath("business-profile", result === "connected" ? "connected" : "error"), request.nextUrl.origin));
}
