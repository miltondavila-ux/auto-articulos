import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret, exchangeCodeForThreadsTokens } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getStoredThreadsAppCredentials } from "@/lib/threads-app-config";
import { canPublishToNetwork } from "@/lib/social-access";
import { THREADS_STATE_COOKIE } from "../connect/constants";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const cookieStore = await cookies();
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");

  if (!(await canPublishToNetwork(userId, "threads")) || !state || state !== cookieStore.get(THREADS_STATE_COOKIE)?.value || !code) {
    return NextResponse.redirect(
      new URL("/dashboard/configuracion?threads=error", request.url)
    );
  }

  try {
    const appCreds = await getStoredThreadsAppCredentials();
    const redirectUri = `${request.nextUrl.protocol}//${request.nextUrl.host}/api/search-integrations/threads/callback`;
    const tokens = await exchangeCodeForThreadsTokens(code, redirectUri, appCreds);

    const expiresAt = new Date(Date.now() + tokens.expiresInSeconds * 1000);

    await prisma.threadsIntegration.upsert({
      where: { userId },
      create: {
        userId,
        threadsUserId: tokens.threadsUserId,
        threadsUsername: tokens.threadsUsername,
        accessTokenEncrypted: encryptSecret(tokens.longLivedToken),
        expiresAt,
      },
      update: {
        threadsUserId: tokens.threadsUserId,
        threadsUsername: tokens.threadsUsername,
        accessTokenEncrypted: encryptSecret(tokens.longLivedToken),
        expiresAt,
      },
    });

    const response = NextResponse.redirect(
      new URL("/dashboard/configuracion?threads=connected", request.url)
    );
    response.cookies.delete(THREADS_STATE_COOKIE);
    return response;
  } catch (error) {
    console.error("Error en Threads OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/dashboard/configuracion?threads=error", request.url)
    );
  }
}
