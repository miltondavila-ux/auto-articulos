import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret, exchangeCodeForInstagramTokens } from "@auto-articulos/shared";
import { getCurrentUser, getCurrentUserId } from "@/lib/current-user";
import { getStoredInstagramAppCredentials } from "@/lib/instagram-app-config";
import { INSTAGRAM_STATE_COOKIE } from "../connect/route";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const currentUser = await getCurrentUser();
  const cookieStore = await cookies();
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");

  if (!state || state !== cookieStore.get(INSTAGRAM_STATE_COOKIE)?.value || !code) {
    return NextResponse.redirect(
      new URL("/dashboard/configuracion?instagram=error", request.url)
    );
  }

  try {
    const appCreds = await getStoredInstagramAppCredentials();
    const redirectUri = `${request.nextUrl.protocol}//${request.nextUrl.host}/api/search-integrations/instagram/callback`;
    const tokens = await exchangeCodeForInstagramTokens(code, redirectUri, appCreds);

    const expiresAt = new Date(Date.now() + tokens.expiresInSeconds * 1000);

    await prisma.instagramIntegration.upsert({
      where: { userId },
      create: {
        userId,
        instagramBusinessAccountId: tokens.instagramBusinessAccountId,
        instagramUsername: tokens.instagramUsername,
        accessTokenEncrypted: encryptSecret(tokens.longLivedToken),
        expiresAt,
      },
      update: {
        instagramBusinessAccountId: tokens.instagramBusinessAccountId,
        instagramUsername: tokens.instagramUsername,
        accessTokenEncrypted: encryptSecret(tokens.longLivedToken),
        expiresAt,
      },
    });

    if (currentUser.role === "admin") await prisma.facebookPageIntegration.upsert({
      where: { userId },
      create: {
        userId,
        facebookPageId: tokens.facebookPageId,
        facebookPageName: tokens.facebookPageName,
        accessTokenEncrypted: encryptSecret(tokens.longLivedToken),
        expiresAt,
      },
      update: {
        facebookPageId: tokens.facebookPageId,
        facebookPageName: tokens.facebookPageName,
        accessTokenEncrypted: encryptSecret(tokens.longLivedToken),
        expiresAt,
      },
    });

    const response = NextResponse.redirect(
      new URL("/dashboard/configuracion?instagram=connected", request.url)
    );
    response.cookies.delete(INSTAGRAM_STATE_COOKIE);
    return response;
  } catch (error: any) {
    console.error("Error en Instagram OAuth callback:", error);
    const errorMsg = encodeURIComponent(error?.message || "Error desconocido");
    return NextResponse.redirect(
      new URL(`/dashboard/configuracion?instagram=error&msg=${errorMsg}`, request.url)
    );
  }
}
