import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret, formatBingTokenPayload } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { BING_STATE_COOKIE, bingOAuthConfig } from "@/lib/bing-oauth";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const cookieStore = await cookies();
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  // Los dos motivos de falla se veían idénticos desde la pantalla, así que el
  // aviso siempre culpaba al doble clic (`motivo=estado`), incluso cuando el
  // problema real era que Bing rechazó el intercambio del código
  // (`motivo=token`, típicamente credenciales de la app mal configuradas).
  if (!state || state !== cookieStore.get(BING_STATE_COOKIE)?.value || !code) {
    return NextResponse.redirect(
      new URL("/dashboard/configuracion?bing=error&motivo=estado", request.url),
    );
  }
  // El error real de Bing solo iba a `console.error`, y los logs de Vercel
  // rotan en minutos: en la práctica nunca se llegaba a leer y había que
  // adivinar. Se propaga a la pantalla, que es donde está el usuario cuando
  // pasa. No hay riesgo de filtrar nada: lo que Bing devuelve acá es un código
  // de error (`invalid_client`, `invalid_grant`, ...) y su descripción, nunca
  // el secreto ni el token.
  let detalle = "";
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true } });
    const { clientId, clientSecret, redirectUri } = bingOAuthConfig();
    const tokenResponse = await fetch(
      "https://www.bing.com/webmasters/oauth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      },
    );
    const rawText = await tokenResponse.text();
    let token: {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    } = {};
    try {
      token = JSON.parse(rawText);
    } catch {
      console.error(`[bing/callback] Respuesta no-JSON de Bing (HTTP ${tokenResponse.status}):`, rawText);
    }

    if (!token.refresh_token) {
      detalle =
        [token.error, token.error_description].filter(Boolean).join(": ") ||
        `HTTP ${tokenResponse.status}: ${rawText.slice(0, 150)}`;
      console.error(
        `[bing/callback] Bing rechazó el intercambio del código: HTTP ${tokenResponse.status} ${detalle}`,
      );
      throw new Error("Bing no entregó refresh token.");
    }
    const payload = formatBingTokenPayload({
      refreshToken: token.refresh_token,
      accessToken: token.access_token,
      expiresAt: Date.now() + Math.max(((token.expires_in ?? 3600) - 300) * 1000, 60000),
    });
    const siteDomain = user.selectedSiteDomain ?? "";
    const existing = await prisma.searchIntegration.findFirst({ where: { userId, provider: "bing", siteDomain } });
    if (existing) await prisma.searchIntegration.update({ where: { id: existing.id }, data: { encryptedRefreshToken: encryptSecret(payload) } });
    else await prisma.searchIntegration.create({ data: { userId, provider: "bing", siteDomain, encryptedRefreshToken: encryptSecret(payload) } });
    const response = NextResponse.redirect(
      new URL("/dashboard/configuracion?bing=connected", request.url),
    );
    response.cookies.delete(BING_STATE_COOKIE);
    return response;
  } catch (error) {
    if (!detalle) {
      // No fue Bing quien rechazó: falló algo nuestro (variables de entorno,
      // guardado en base de datos). Distinguirlo importa, porque la solución
      // es completamente distinta.
      detalle = `fallo interno: ${error instanceof Error ? error.message : String(error)}`;
    }
    const destino = new URL("/dashboard/configuracion", request.url);
    destino.searchParams.set("bing", "error");
    destino.searchParams.set("motivo", "token");
    destino.searchParams.set("detalle", detalle.slice(0, 200));
    return NextResponse.redirect(destino);
  }
}
