import crypto from "node:crypto";

export const MCP_STATE_COOKIE = "10mws_mcp_oauth_state";
export const MCP_SCOPE = "articles:read articles:write articles:delete";

export function generatePkceCodes(): { codeChallenge: string; codeVerifier: string } {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeChallenge, codeVerifier };
}

export function mcpOAuthConfig() {
  const clientId = process.env.MCP_10MWS_CLIENT_ID;
  const clientSecret = process.env.MCP_10MWS_CLIENT_SECRET;
  const serverUrl = process.env.MCP_SERVER_URL_10MWS;
  const redirectUri =
    process.env.MCP_10MWS_REDIRECT_URI ??
    "https://seototal.lasolucionweb.com/api/integrations/10mws-mcp/callback";

  if (!clientId || !clientSecret || !serverUrl) {
    throw new Error(
      "10MWS MCP OAuth no está configurado (falta MCP_10MWS_CLIENT_ID, MCP_10MWS_CLIENT_SECRET, o MCP_SERVER_URL_10MWS).",
    );
  }

  return { clientId, clientSecret, serverUrl, redirectUri };
}

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const { clientId, clientSecret, serverUrl, redirectUri } = mcpOAuthConfig();

  const tokenUrl = new URL("/oauth/token", serverUrl).toString();
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`10MWS MCP token exchange falló: ${response.status} ${error}`);
  }

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!data.access_token || !data.refresh_token) {
    throw new Error("10MWS MCP no entregó access_token o refresh_token");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in ?? 3600,
  };
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const { clientId, clientSecret, serverUrl } = mcpOAuthConfig();

  const tokenUrl = new URL("/oauth/token", serverUrl).toString();
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`10MWS MCP refresh token falló: ${response.status}`);
  }

  const data = (await response.json()) as { access_token?: string; expires_in?: number };

  if (!data.access_token) {
    throw new Error("10MWS MCP no entregó nuevo access_token");
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 3600,
  };
}
