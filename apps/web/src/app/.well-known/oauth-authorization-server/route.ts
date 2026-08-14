import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Metadatos RFC 8414; Alexa los lee durante configure-account-linking. */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  return NextResponse.json({
    issuer: origin,
    authorization_endpoint: `${origin}/api/oauth2/authorize`,
    token_endpoint: `${origin}/api/oauth2/token`,
    grant_types_supported: ["authorization_code", "refresh_token"],
    response_types_supported: ["code"],
    scopes_supported: ["oportunidades:leer", "oportunidades:publicar", "offline_access"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_basic", "client_secret_post"],
  });
}
