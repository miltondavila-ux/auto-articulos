import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { MCP_STATE_COOKIE, exchangeCodeForToken, MCP_SCOPE } from "@/lib/10mws-mcp-oauth";

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const cookieStore = await cookies();
    const state = request.nextUrl.searchParams.get("state");
    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/integraciones?mcp=error&reason=${encodeURIComponent(error)}`, request.url),
      );
    }

    if (!state || !code) {
      return NextResponse.redirect(new URL("/dashboard/integraciones?mcp=error", request.url));
    }

    const storedState = cookieStore.get(MCP_STATE_COOKIE)?.value;
    if (!storedState || state !== storedState) {
      return NextResponse.redirect(new URL("/dashboard/integraciones?mcp=error", request.url));
    }

    let codeVerifier: string;
    try {
      const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
      codeVerifier = parsed.codeVerifier;
      if (!codeVerifier) throw new Error("Missing codeVerifier");
    } catch {
      return NextResponse.redirect(new URL("/dashboard/integraciones?mcp=error", request.url));
    }

    const { accessToken, refreshToken, expiresIn } = await exchangeCodeForToken(code, codeVerifier);
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    const existing = await prisma.mcpConnection.findFirst({
      where: { userId, provider: "10mws" },
    });

    if (existing) {
      await prisma.mcpConnection.update({
        where: { id: existing.id },
        data: {
          accessTokenEncrypted: encryptSecret(accessToken),
          refreshTokenEncrypted: encryptSecret(refreshToken),
          tokenExpiresAt,
          scope: MCP_SCOPE,
          revokedAt: null,
        },
      });
    } else {
      await prisma.mcpConnection.create({
        data: {
          userId,
          provider: "10mws",
          accessTokenEncrypted: encryptSecret(accessToken),
          refreshTokenEncrypted: encryptSecret(refreshToken),
          tokenExpiresAt,
          scope: MCP_SCOPE,
        },
      });
    }

    const response = NextResponse.redirect(
      new URL("/dashboard/integraciones?mcp=connected", request.url),
    );
    response.cookies.delete(MCP_STATE_COOKIE);
    return response;
  } catch (error) {
    console.error("10MWS MCP callback error:", error);
    return NextResponse.redirect(new URL("/dashboard/integraciones?mcp=error", request.url));
  }
}
