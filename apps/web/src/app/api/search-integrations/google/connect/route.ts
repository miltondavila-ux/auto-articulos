import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import {
  GOOGLE_SCOPE,
  GOOGLE_STATE_COOKIE,
  googleOAuthConfig,
} from "@/lib/google-oauth";

export async function GET() {
  await getCurrentUserId();
  try {
    const { clientId, redirectUri } = googleOAuthConfig();
    const state = randomBytes(24).toString("base64url");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPE,
      access_type: "offline",
      prompt: "consent",
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
