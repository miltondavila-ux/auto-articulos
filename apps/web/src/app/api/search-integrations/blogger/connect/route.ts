import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getBloggerAuthUrl } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { bloggerOAuthConfig } from "@/lib/blogger-oauth";
import { canPublishToNetwork } from "@/lib/social-access";
import { BLOGGER_STATE_COOKIE } from "./constants";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "blogger"))) return NextResponse.json({ error: "Blogger no está habilitado para este usuario." }, { status: 403 });
  try {
    const { clientId } = await bloggerOAuthConfig();
    const reqUrl = new URL(request.url);
    const redirectUri = `${reqUrl.protocol}//${reqUrl.host}/api/search-integrations/blogger/callback`;
    const state = randomBytes(24).toString("base64url");
    const response = NextResponse.redirect(getBloggerAuthUrl(state, redirectUri, clientId));
    response.cookies.set(BLOGGER_STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/dashboard/configuracion?blogger=needs_config", request.url));
  }
}
