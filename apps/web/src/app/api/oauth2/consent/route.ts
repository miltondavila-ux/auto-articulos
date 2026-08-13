import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { issueAuthorizationCode, OAuthError, validateAuthorizeRequest } from "@/lib/oauth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { params?: Record<string, string>; approve?: boolean };
    const params = new URLSearchParams(body.params ?? {});
    const authorization = validateAuthorizeRequest(params, request.nextUrl.origin);
    if (body.approve !== true) {
      const redirect = new URL(authorization.redirectUri);
      redirect.searchParams.set("error", "access_denied");
      if (authorization.state) redirect.searchParams.set("state", authorization.state);
      return NextResponse.json({ redirect: redirect.toString() });
    }
    const code = await issueAuthorizationCode(await getCurrentUserId(), authorization);
    const redirect = new URL(authorization.redirectUri);
    redirect.searchParams.set("code", code);
    if (authorization.state) redirect.searchParams.set("state", authorization.state);
    return NextResponse.json({ redirect: redirect.toString() });
  } catch (error) {
    const message = error instanceof OAuthError ? error.message : "No se pudo autorizar el enlace.";
    return NextResponse.json({ error: "invalid_request", error_description: message }, { status: 400 });
  }
}
