import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getPinterestAuthUrl } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getStoredPinterestAppCredentials } from "@/lib/pinterest-app-config";

export const PINTEREST_STATE_COOKIE = "pinterest_oauth_state";

export async function GET(request: Request) {
  await getCurrentUserId();
  try {
    const credentials = await getStoredPinterestAppCredentials();
    const url = new URL(request.url);
    const redirectUri = `${url.protocol}//${url.host}/api/search-integrations/pinterest/callback`;
    const state = randomBytes(24).toString("base64url");
    const response = NextResponse.redirect(getPinterestAuthUrl(state, redirectUri, credentials));
    response.cookies.set(PINTEREST_STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/dashboard/configuracion?pinterest=needs_config", request.url));
  }
}
