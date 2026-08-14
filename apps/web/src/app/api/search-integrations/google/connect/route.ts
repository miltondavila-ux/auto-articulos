import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import {
  GOOGLE_SCOPE,
  GOOGLE_STATE_COOKIE,
  googleOAuthConfig,
} from "@/lib/google-oauth";

export async function GET(request: NextRequest) {
  await getCurrentUserId();
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/dashboard";
  const selectAccount = request.nextUrl.searchParams.get("prompt") === "select_account";
  try {
    const { clientId, redirectUri } = googleOAuthConfig();
    const stateObj = { nonce: randomBytes(16).toString("base64url"), returnTo };
    const state = Buffer.from(JSON.stringify(stateObj)).toString("base64url");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPE,
      access_type: "offline",
      prompt: selectAccount ? "select_account consent" : "consent",
      include_granted_scopes: "true",
      state,
    }).toString();
    const response = NextResponse.redirect(url);
    response.cookies.set(GOOGLE_STATE_COOKIE, state, {
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
