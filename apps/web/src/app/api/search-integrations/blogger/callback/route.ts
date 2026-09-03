import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret, exchangeCodeForBloggerTokens, getBloggerBlogs } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { bloggerOAuthConfig } from "@/lib/blogger-oauth";
import { BLOGGER_STATE_COOKIE } from "../connect/constants";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const cookieStore = await cookies();
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  if (!state || state !== cookieStore.get(BLOGGER_STATE_COOKIE)?.value || !code) return NextResponse.redirect(new URL("/dashboard/configuracion?blogger=error", request.url));
  try {
    const { clientId, clientSecret } = bloggerOAuthConfig();
    const redirectUri = `${request.nextUrl.protocol}//${request.nextUrl.host}/api/search-integrations/blogger/callback`;
    const tokens = await exchangeCodeForBloggerTokens(code, redirectUri, clientId, clientSecret);
    const blogs = await getBloggerBlogs(tokens.access_token);
    const blog = blogs[0];
    if (!blog) throw new Error("La cuenta de Google no tiene blogs de Blogger disponibles.");
    await prisma.bloggerIntegration.upsert({ where: { userId }, create: { userId, blogId: blog.id, blogName: blog.name, accessTokenEncrypted: encryptSecret(tokens.access_token), refreshTokenEncrypted: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null, expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null }, update: { blogId: blog.id, blogName: blog.name, accessTokenEncrypted: encryptSecret(tokens.access_token), refreshTokenEncrypted: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : undefined, expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null } });
    const response = NextResponse.redirect(new URL("/dashboard/configuracion?blogger=connected", request.url));
    response.cookies.delete(BLOGGER_STATE_COOKIE);
    return response;
  } catch (error) {
    console.error("Error en Blogger OAuth callback:", error);
    return NextResponse.redirect(new URL("/dashboard/configuracion?blogger=error", request.url));
  }
}
