import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getThreadsAuthUrl } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getStoredThreadsAppCredentials } from "@/lib/threads-app-config";

export const THREADS_STATE_COOKIE = "threads_oauth_state";

export async function GET(request: Request) {
  await getCurrentUserId();

  try {
    const appCreds = await getStoredThreadsAppCredentials();
    const reqUrl = new URL(request.url);
    const redirectUri = `${reqUrl.protocol}//${reqUrl.host}/api/search-integrations/threads/callback`;
    const state = randomBytes(24).toString("base64url");
    const authUrl = getThreadsAuthUrl(state, redirectUri, appCreds);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set(THREADS_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
