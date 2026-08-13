import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret } from "@auto-articulos/shared";
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
    const token = (await tokenResponse.json().catch(() => ({}))) as {
      refresh_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!tokenResponse.ok || !token.refresh_token) {
      detalle =
        [token.error, token.error_description].filter(Boolean).join(": ") ||
        `HTTP ${tokenResponse.status} sin refresh_token`;
      console.error(
        `[bing/callback] Bing rechazó el intercambio del código: HTTP ${tokenResponse.status} ${detalle}`,
      );
      throw new Error("Bing no entregó refresh token.");
    }
    await prisma.searchIntegration.upsert({
      where: { userId_provider: { userId, provider: "bing" } },
      create: {
        userId,
        provider: "bing",
        encryptedRefreshToken: encryptSecret(token.refresh_token),
      },
      update: { encryptedRefreshToken: encryptSecret(token.refresh_token) },
    });
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
