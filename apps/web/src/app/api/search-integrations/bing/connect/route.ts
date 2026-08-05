import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { BING_SCOPE, BING_STATE_COOKIE, bingOAuthConfig } from "@/lib/bing-oauth";

export async function GET() {
  await getCurrentUserId();
  try {
    const { clientId, redirectUri } = bingOAuthConfig();
    const state = randomBytes(24).toString("base64url");
    const url = new URL("https://www.bing.com/webmasters/oauth/authorize");
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: BING_SCOPE,
      state,
    }).toString();
    const response = NextResponse.redirect(url);
    response.cookies.set(BING_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
