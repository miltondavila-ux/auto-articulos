import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getTumblrAuthUrl } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { canPublishToNetwork } from "@/lib/social-access";
import { getStoredTumblrAppCredentials } from "@/lib/tumblr-app-config";

import { TUMBLR_STATE_COOKIE } from "./constants";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "tumblr"))) return NextResponse.json({ error: "Tumblr no está habilitado para este usuario." }, { status: 403 });
  try {
    const credentials = await getStoredTumblrAppCredentials();
    const reqUrl = new URL(request.url);
    const redirectUri = `${reqUrl.protocol}//${reqUrl.host}/api/search-integrations/tumblr/callback`;
    const state = randomBytes(24).toString("base64url");
    const response = NextResponse.redirect(getTumblrAuthUrl(state, redirectUri, credentials));
    response.cookies.set(TUMBLR_STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/dashboard/configuracion?tumblr=needs_config", request.url));
  }
}
