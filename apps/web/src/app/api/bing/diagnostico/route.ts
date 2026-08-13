import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";

/**
 * DIAGNÓSTICO TEMPORAL de la rotación del refresh token de Bing (13/8/2026).
 *
 * Por qué existe: la conexión de Bing muere después de un solo uso, y las dos
 * explicaciones disponibles se contradicen entre sí y con lo observado. La
 * documentación de Microsoft dice que el refresh no devuelve un token nuevo;
 * el reporte de Microsoft Q&A dice que sí lo devuelve pero que el nuevo no
 * sirve y hay que conservar el original; y acá el original tampoco sobrevive
 * al segundo uso. Tres rondas de arreglos a ciegas después, esto mide qué pasa
 * de verdad en vez de suponerlo.
 *
 * Consume el refresh token guardado — después de correrlo hay que reconectar.
 * No envía nada a indexar y no modifica ninguna otra tabla.
 *
 * BORRAR una vez resuelto el problema de rotación.
 */

const TOKEN_URL = "https://www.bing.com/webmasters/oauth/token";

async function refrescar(refreshToken: string) {
  const clientId = process.env.BING_WEBMASTER_CLIENT_ID;
  const clientSecret = process.env.BING_WEBMASTER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { ok: false, detalle: "faltan las variables de entorno de Bing" };
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  return {
    ok: res.ok && !!data.access_token,
    http: res.status,
    detalle:
      [data.error, data.error_description].filter(Boolean).join(": ") || undefined,
    expiraEnSegundos: data.expires_in,
    // Nunca se devuelven los tokens: solo si vino uno nuevo y si cambió.
    devolvioRefreshTokenNuevo: !!data.refresh_token,
    refreshTokenCambio: !!data.refresh_token && data.refresh_token !== refreshToken,
    _nuevo: data.refresh_token,
  };
}

export async function GET() {
  const userId = await getCurrentUserId();
  const integration = await prisma.searchIntegration.findUnique({
    where: { userId_provider: { userId, provider: "bing" } },
  });
  if (!integration) {
    return NextResponse.json(
      { error: "No hay conexión de Bing guardada para este usuario." },
      { status: 404 },
    );
  }

  const original = decryptSecret(integration.encryptedRefreshToken);

  // Prueba 1: usar el token guardado.
  const p1 = await refrescar(original);

  // Prueba 2: volver a usar EL MISMO token original. Si esto funciona, el
  // token es reutilizable y hay que ignorar los rotados (lo que dice el
  // reporte de Microsoft Q&A). Si falla, es de un solo uso.
  const p2 = await refrescar(original);

  // Prueba 3: usar el token rotado que devolvió la prueba 1, si vino alguno.
  // Si esto funciona, hay que guardar siempre el rotado.
  const p3 = p1._nuevo ? await refrescar(p1._nuevo) : null;

  // Se deja guardado el token que haya quedado vivo, para no dejar la cuenta
  // peor de como estaba.
  const sobreviviente = p3?.ok ? p3._nuevo : p2.ok ? original : null;
  if (sobreviviente) {
    await prisma.searchIntegration.update({
      where: { id: integration.id },
      data: { encryptedRefreshToken: encryptSecret(sobreviviente) },
    });
  }

  const limpiar = (p: Awaited<ReturnType<typeof refrescar>> | null) => {
    if (!p) return null;
    const { _nuevo, ...resto } = p;
    void _nuevo;
    return resto;
  };

  return NextResponse.json({
    prueba1_tokenGuardado: limpiar(p1),
    prueba2_mismoTokenOtraVez: limpiar(p2),
    prueba3_tokenRotado: limpiar(p3),
    conclusion: p3?.ok
      ? "HAY QUE GUARDAR EL ROTADO (comportamiento actual correcto)."
      : p2.ok
        ? "HAY QUE CONSERVAR EL ORIGINAL E IGNORAR EL ROTADO."
        : "NINGUNO DE LOS DOS SOBREVIVE: el refresh solo sirve una vez por autorizacion.",
    hayQueReconectar: !sobreviviente,
  });
}
