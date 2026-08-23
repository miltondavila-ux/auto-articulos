import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret, exchangeCodeForLinkedInTokens } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getStoredLinkedInAppCredentials } from "@/lib/linkedin-app-config";
import { LINKEDIN_STATE_COOKIE } from "../connect/constants";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const cookieStore = await cookies();
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");

  if (!state || state !== cookieStore.get(LINKEDIN_STATE_COOKIE)?.value || !code) {
    return NextResponse.redirect(
      new URL("/dashboard/configuracion?linkedin=error", request.url)
    );
  }

  try {
    const appCreds = await getStoredLinkedInAppCredentials();
    const redirectUri = `${request.nextUrl.protocol}//${request.nextUrl.host}/api/search-integrations/linkedin/callback`;
    const tokens = await exchangeCodeForLinkedInTokens(code, redirectUri, appCreds);

    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    await prisma.linkedInIntegration.upsert({
      where: { userId },
      create: {
        userId,
        linkedinUserId: tokens.linkedinUserId,
        linkedinUsername: tokens.linkedinUsername,
        accessTokenEncrypted: encryptSecret(tokens.accessToken),
        expiresAt,
      },
      update: {
        linkedinUserId: tokens.linkedinUserId,
        linkedinUsername: tokens.linkedinUsername,
        accessTokenEncrypted: encryptSecret(tokens.accessToken),
        expiresAt,
      },
    });

    const response = NextResponse.redirect(
      new URL("/dashboard/configuracion?linkedin=connected", request.url)
    );
    response.cookies.delete(LINKEDIN_STATE_COOKIE);
    return response;
  } catch (error) {
    console.error("Error en LinkedIn OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/dashboard/configuracion?linkedin=error", request.url)
    );
  }
}
