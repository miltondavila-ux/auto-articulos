import { NextResponse } from "next/server";
import { friendlyConnectionError } from "@/lib/composio-error-message";

const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

/**
 * Cuerpo común de las rutas «Probar conexión»: ejecuta una comprobación de solo lectura
 * y responde siempre con un mensaje claro en español (nunca el error crudo de la red).
 */
export async function runConnectionTest(network: string, check: () => Promise<string | null>): Promise<NextResponse> {
  try {
    const account = await check();
    return NextResponse.json({ ok: true, account }, { headers: NO_CACHE });
  } catch (error) {
    console.error(`Probar conexión (${network}) falló:`, error);
    const raw = error instanceof Error ? error.message : String(error);
    const fallback = "No se pudo comprobar la conexión. Vuelve a conectar la cuenta e inténtalo de nuevo.";
    // Solo se muestran los errores que el clasificador reconoce; un mensaje interno (aunque esté
    // en español, como «credencial cifrada inválida») no se le enseña a la persona.
    const friendly = friendlyConnectionError(raw, fallback);
    return NextResponse.json({ error: friendly === raw ? fallback : friendly }, { status: 502, headers: NO_CACHE });
  }
}

export const NOT_CONNECTED = "Esta red no está conectada todavía.";
