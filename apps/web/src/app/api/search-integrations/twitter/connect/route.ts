import { randomBytes, createHash } from "crypto";
import { NextResponse } from "next/server";
import { getTwitterAuthUrl } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getStoredTwitterAppCredentials } from "@/lib/twitter-app-config";

export const TWITTER_STATE_COOKIE = "twitter_oauth_state";
export const TWITTER_VERIFIER_COOKIE = "twitter_code_verifier";

export async function GET(request: Request) {
  await getCurrentUserId();

  try {
    const appCreds = await getStoredTwitterAppCredentials();
    const reqUrl = new URL(request.url);
    const redirectUri = `${reqUrl.protocol}//${reqUrl.host}/api/search-integrations/twitter/callback`;

    // Generar state y code_verifier para PKCE
    const state = randomBytes(24).toString("base64url");
    const codeVerifier = randomBytes(32)
      .toString("base64url")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    // Crear code_challenge (S256)
    const codeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    const authUrl = getTwitterAuthUrl(state, codeChallenge, redirectUri, appCreds);

    const response = NextResponse.redirect(authUrl);

    response.cookies.set(TWITTER_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    response.cookies.set(TWITTER_VERIFIER_COOKIE, codeVerifier, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    return response;
  } catch {
    const reqUrl = new URL(request.url);
    return NextResponse.redirect(
      new URL("/dashboard/configuracion?twitter=needs_config", reqUrl.origin)
    );
  }
}
