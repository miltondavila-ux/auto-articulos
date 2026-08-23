import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret, exchangeCodeForTwitterTokens } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getStoredTwitterAppCredentials } from "@/lib/twitter-app-config";
import { TWITTER_STATE_COOKIE, TWITTER_VERIFIER_COOKIE } from "../connect/constants";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const cookieStore = await cookies();
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");

  if (!state || state !== cookieStore.get(TWITTER_STATE_COOKIE)?.value || !code) {
    return NextResponse.redirect(
      new URL("/dashboard/configuracion?twitter=error", request.url)
    );
  }

  const codeVerifier = cookieStore.get(TWITTER_VERIFIER_COOKIE)?.value;
  if (!codeVerifier) {
    return NextResponse.redirect(
      new URL("/dashboard/configuracion?twitter=error", request.url)
    );
  }

  try {
    const appCreds = await getStoredTwitterAppCredentials();
    const redirectUri = `${request.nextUrl.protocol}//${request.nextUrl.host}/api/search-integrations/twitter/callback`;
    const tokens = await exchangeCodeForTwitterTokens(code, codeVerifier, redirectUri, appCreds);

    const expiresAt = new Date(Date.now() + tokens.expiresInSeconds * 1000);

    await prisma.twitterIntegration.upsert({
      where: { userId },
      create: {
        userId,
        twitterUserId: tokens.twitterUserId,
        twitterUsername: tokens.twitterUsername,
        accessTokenEncrypted: encryptSecret(tokens.accessToken),
        refreshTokenEncrypted: encryptSecret(tokens.refreshToken),
        expiresAt,
      },
      update: {
        twitterUserId: tokens.twitterUserId,
        twitterUsername: tokens.twitterUsername,
        accessTokenEncrypted: encryptSecret(tokens.accessToken),
        refreshTokenEncrypted: encryptSecret(tokens.refreshToken),
        expiresAt,
      },
    });

    const response = NextResponse.redirect(
      new URL("/dashboard/configuracion?twitter=connected", request.url)
    );
    response.cookies.delete(TWITTER_STATE_COOKIE);
    response.cookies.delete(TWITTER_VERIFIER_COOKIE);
    return response;
  } catch (error) {
    console.error("Error en Twitter OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/dashboard/configuracion?twitter=error", request.url)
    );
  }
}
