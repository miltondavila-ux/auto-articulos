import { NextRequest, NextResponse } from "next/server";
import { exchangeAuthorizationCode, OAuthError, oauthClient, refreshTokens } from "@/lib/oauth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientCredentials(request: NextRequest, body: URLSearchParams) {
  const basic = request.headers.get("authorization")?.match(/^Basic\s+(.+)$/i)?.[1];
  if (basic) {
    const [id, secret] = Buffer.from(basic, "base64").toString("utf8").split(":", 2);
    return { clientId: id, clientSecret: secret };
  }
  return { clientId: body.get("client_id") ?? "", clientSecret: body.get("client_secret") ?? "" };
}

export async function POST(request: NextRequest) {
  try {
    const body = new URLSearchParams(await request.text());
    const credentials = clientCredentials(request, body);
    const client = oauthClient(credentials.clientId);
    // ChatGPT es cliente público con PKCE: no usa secreto. Alexa conserva su
    // validación confidencial mediante client_secret_basic o client_secret_post.
    if (!client || (client.clientSecret ? credentials.clientSecret !== client.clientSecret : Boolean(credentials.clientSecret))) {
      return NextResponse.json({ error: "invalid_client" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    const grantType = body.get("grant_type");
    const result = grantType === "authorization_code"
      ? await exchangeAuthorizationCode({ code: body.get("code") ?? "", redirectUri: body.get("redirect_uri") ?? "", clientId: credentials.clientId, codeVerifier: body.get("code_verifier") ?? "" })
      : grantType === "refresh_token"
        ? await refreshTokens(body.get("refresh_token") ?? "", credentials.clientId)
        : (() => { throw new OAuthError("unsupported_grant_type", "grant_type no admitido."); })();
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const oauthError = error instanceof OAuthError ? error : new OAuthError("invalid_request", "Solicitud de token inválida.");
    return NextResponse.json({ error: oauthError.code, error_description: oauthError.message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
