import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import {
  BUSINESS_PROFILE_STATE_COOKIE,
  businessProfileOAuthConfig,
} from "@/lib/google-oauth";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const cookieStore = await cookies();
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  if (
    !state ||
    state !== cookieStore.get(BUSINESS_PROFILE_STATE_COOKIE)?.value ||
    !code
  ) {
    return NextResponse.redirect(
      new URL("/dashboard/configuracion?businessProfile=error", request.url),
    );
  }
  try {
    const { clientId, clientSecret, redirectUri } = businessProfileOAuthConfig();
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
    await prisma.businessProfileIntegration.upsert({
      where: { userId },
      create: {
        userId,
        encryptedRefreshToken: encryptSecret(token.refresh_token),
      },
      update: {
        encryptedRefreshToken: encryptSecret(token.refresh_token),
        // Si el usuario reconecta (ej. con otra cuenta de Google), la
        // ubicación elegida antes ya no es válida — se vuelve a elegir.
        accountName: null,
        locationName: null,
        locationTitle: null,
      },
    });
    const response = NextResponse.redirect(
      new URL(
        "/dashboard/configuracion?businessProfile=connected",
        request.url,
      ),
    );
    response.cookies.delete(BUSINESS_PROFILE_STATE_COOKIE);
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard/configuracion?businessProfile=error", request.url),
    );
  }
}
