import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { BING_STATE_COOKIE, bingOAuthConfig } from "@/lib/bing-oauth";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const cookieStore = await cookies();
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  if (!state || state !== cookieStore.get(BING_STATE_COOKIE)?.value || !code) {
    return NextResponse.redirect(
      new URL("/dashboard/configuracion?bing=error", request.url),
    );
  }
  try {
    const { clientId, clientSecret, redirectUri } = bingOAuthConfig();
    const tokenResponse = await fetch(
      "https://www.bing.com/webmasters/oauth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      },
    );
    const token = (await tokenResponse.json()) as { refresh_token?: string };
    if (!tokenResponse.ok || !token.refresh_token)
      throw new Error("Bing no entregó refresh token.");
    await prisma.searchIntegration.upsert({
      where: { userId_provider: { userId, provider: "bing" } },
      create: {
        userId,
        provider: "bing",
        encryptedRefreshToken: encryptSecret(token.refresh_token),
      },
      update: { encryptedRefreshToken: encryptSecret(token.refresh_token) },
    });
    const response = NextResponse.redirect(
      new URL("/dashboard/configuracion?bing=connected", request.url),
    );
    response.cookies.delete(BING_STATE_COOKIE);
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard/configuracion?bing=error", request.url),
    );
  }
}
