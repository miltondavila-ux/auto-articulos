import { NextRequest, NextResponse } from "next/server";

/**
 * Documento de descubrimiento de recurso protegido (RFC 9728).
 *
 * Es lo primero que consulta un cliente MCP cuando recibe un 401 del endpoint
 * /api/mcp: le dice qué recurso está protegido y quién emite los tokens.
 * Alexa+ for Builders lo exige en esta ruta exacta y lo usa para autodescubrir
 * los endpoints del authorization server durante `alexa-ai
 * configure-account-linking`.
 *
 * Se declara la propia app como authorization server porque en la FASE 2 los
 * endpoints /api/oauth2/authorize y /api/oauth2/token van a vivir acá mismo,
 * reutilizando el login existente como pantalla de consentimiento. Mientras
 * esos endpoints no existan, este documento ya es correcto: describe la
 * intención, y el 401 sigue siendo la respuesta honesta para un cliente sin
 * token.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  return NextResponse.json({
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
    scopes_supported: ["oportunidades:leer", "oportunidades:publicar"],
    bearer_methods_supported: ["header"],
  });
}
