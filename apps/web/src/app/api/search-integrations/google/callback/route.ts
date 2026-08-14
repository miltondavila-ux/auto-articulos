import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { GOOGLE_STATE_COOKIE, googleOAuthConfig } from "@/lib/google-oauth";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const cookieStore = await cookies();
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  if (
    !state ||
    state !== cookieStore.get(GOOGLE_STATE_COOKIE)?.value ||
    !code
  ) {
    return NextResponse.redirect(
      new URL("/dashboard/configuracion?google=error", request.url),
    );
  }
  try {
    const { clientId, clientSecret, redirectUri } = googleOAuthConfig();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    const token = (await tokenResponse.json()) as { refresh_token?: string };
    if (!tokenResponse.ok || !token.refresh_token)
      throw new Error("Google no entregó refresh token.");
    await prisma.searchIntegration.upsert({
      where: { userId_provider: { userId, provider: "google" } },
      create: {
        userId,
        provider: "google",
        encryptedRefreshToken: encryptSecret(token.refresh_token),
      },
      update: { encryptedRefreshToken: encryptSecret(token.refresh_token) },
    });
    let returnTo = "/dashboard";
    try {
      const parsedState = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
      if (parsedState.returnTo && typeof parsedState.returnTo === "string") {
        returnTo = parsedState.returnTo;
      }
    } catch {
      // fallback a /dashboard
    }

    const redirectTarget = new URL(returnTo, request.url);
    redirectTarget.searchParams.set("google", "connected");
    const response = NextResponse.redirect(redirectTarget);
    response.cookies.delete(GOOGLE_STATE_COOKIE);
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard/configuracion?google=error", request.url),
    );
  }
}
