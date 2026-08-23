import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret, exchangeCodeForTumblrToken, getTumblrBlogs } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { canPublishToNetwork } from "@/lib/social-access";
import { getStoredTumblrAppCredentials } from "@/lib/tumblr-app-config";
import { TUMBLR_STATE_COOKIE } from "../connect/route";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const cookieStore = await cookies();
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  if (!(await canPublishToNetwork(userId, "tumblr")) || !state || state !== cookieStore.get(TUMBLR_STATE_COOKIE)?.value || !code) {
    return NextResponse.redirect(new URL("/dashboard/configuracion?tumblr=error", request.url));
  }
  try {
    const credentials = await getStoredTumblrAppCredentials();
    const redirectUri = `${request.nextUrl.protocol}//${request.nextUrl.host}/api/search-integrations/tumblr/callback`;
    const tokens = await exchangeCodeForTumblrToken(code, redirectUri, credentials);
    const blogs = await getTumblrBlogs(tokens.access_token);
    const firstBlog = blogs[0];
    if (!firstBlog) throw new Error("La cuenta de Tumblr no tiene blogs disponibles.");
    await prisma.tumblrIntegration.upsert({
      where: { userId },
      create: { userId, blogIdentifier: firstBlog.identifier, blogTitle: firstBlog.title, accessTokenEncrypted: encryptSecret(tokens.access_token), refreshTokenEncrypted: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null, expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null },
      update: { blogIdentifier: firstBlog.identifier, blogTitle: firstBlog.title, accessTokenEncrypted: encryptSecret(tokens.access_token), refreshTokenEncrypted: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null, expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null },
    });
    const response = NextResponse.redirect(new URL("/dashboard/configuracion?tumblr=connected", request.url));
    response.cookies.delete(TUMBLR_STATE_COOKIE);
    return response;
  } catch (error) {
    console.error("Error en Tumblr OAuth callback:", error);
    return NextResponse.redirect(new URL("/dashboard/configuracion?tumblr=error", request.url));
  }
}
