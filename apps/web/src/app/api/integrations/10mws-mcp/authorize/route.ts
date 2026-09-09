import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { generatePkceCodes, mcpOAuthConfig, MCP_STATE_COOKIE, MCP_SCOPE } from "@/lib/10mws-mcp-oauth";
import { getCurrentUserId } from "@/lib/current-user";

export async function GET(request: NextRequest) {
  try {
    await getCurrentUserId();
    const { codeChallenge, codeVerifier } = generatePkceCodes();
    const { clientId, serverUrl } = mcpOAuthConfig();

    const returnTo = request.nextUrl.searchParams.get("returnTo") ?? "/dashboard/integraciones";
    const state = Buffer.from(JSON.stringify({ returnTo, codeVerifier })).toString("base64url");

    const cookieStore = await cookies();
    cookieStore.set(MCP_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
    });

    const authUrl = new URL("/oauth/authorize", serverUrl);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", MCP_SCOPE);
    authUrl.searchParams.set("redirect_uri", request.nextUrl.origin + "/api/integrations/10mws-mcp/callback");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("10MWS MCP authorize error:", error);
    return NextResponse.redirect(new URL("/dashboard/integraciones?error=auth_failed", request.url));
  }
}
