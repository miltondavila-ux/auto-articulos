import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { GOOGLE_ANALYTICS_SCOPE, GOOGLE_ANALYTICS_STATE_COOKIE, googleAnalyticsOAuthConfig } from "@/lib/google-analytics-oauth";

export async function GET(request: NextRequest) {
  await getCurrentUserId();
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/dashboard/configuracion";
  const state = Buffer.from(JSON.stringify({ nonce: randomBytes(16).toString("base64url"), returnTo })).toString("base64url");
  try {
    const { clientId, redirectUri } = googleAnalyticsOAuthConfig();
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: GOOGLE_ANALYTICS_SCOPE, access_type: "offline", prompt: "consent", include_granted_scopes: "true", state }).toString();
    const response = NextResponse.redirect(url);
    response.cookies.set(GOOGLE_ANALYTICS_STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo iniciar Google Analytics." }, { status: 503 });
  }
}
