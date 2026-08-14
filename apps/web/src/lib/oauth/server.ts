import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@auto-articulos/db";
import { createMcpAccessToken, MCP_ACCESS_TOKEN_TTL_MS, verifyMcpAccessToken } from "@/lib/session";

export const MCP_SCOPES = ["oportunidades:leer", "oportunidades:publicar", "offline_access"] as const;
const CODE_TTL_MS = 5 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type OAuthClient = {
  clientId: string;
  clientSecret?: string;
  redirectUris: string[];
};

function configuredClient(idEnv: string, redirectEnv: string, secretEnv?: string): OAuthClient | null {
  const clientId = process.env[idEnv]?.trim();
  const redirectUris = process.env[redirectEnv]?.split(",").map((uri) => uri.trim()).filter(Boolean);
  const clientSecret = secretEnv ? process.env[secretEnv] : undefined;
  if (!clientId && !redirectUris?.length && !clientSecret) return null;
  if (!clientId || !redirectUris?.length || (secretEnv && !clientSecret)) {
    throw new Error(`La configuración OAuth ${idEnv} está incompleta.`);
  }
  return { clientId, redirectUris, clientSecret };
}

/** Clientes de confianza separados: Alexa es confidencial; ChatGPT usa PKCE. */
export function oauthClients(): OAuthClient[] {
  return [
    configuredClient("OAUTH_ALEXA_CLIENT_ID", "OAUTH_ALEXA_REDIRECT_URIS", "OAUTH_ALEXA_CLIENT_SECRET"),
    configuredClient("OAUTH_CHATGPT_CLIENT_ID", "OAUTH_CHATGPT_REDIRECT_URIS"),
  ].filter((client): client is OAuthClient => client !== null);
}

export function oauthClient(clientId: string) {
  return oauthClients().find((client) => client.clientId === clientId) ?? null;
}

export function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}

function randomSecret() {
  return randomBytes(32).toString("base64url");
}

export function parseScopes(scope: string | null) {
  const scopes = (scope ?? "").split(" ").filter(Boolean);
  const resourceScopes = scopes.filter((scope) => scope !== "offline_access");
  if (resourceScopes.length === 0 || scopes.some((item) => !MCP_SCOPES.includes(item as (typeof MCP_SCOPES)[number]))) {
    throw new OAuthError("invalid_scope", "El alcance solicitado no es válido.");
  }
  return [...new Set(scopes)].sort();
}

export class OAuthError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export function validateAuthorizeRequest(params: URLSearchParams, origin: string) {
  const clientId = params.get("client_id");
  const redirectUri = params.get("redirect_uri");
  const resource = params.get("resource");
  const codeChallenge = params.get("code_challenge");
  if (params.get("response_type") !== "code") throw new OAuthError("unsupported_response_type", "Solo se admite response_type=code.");
  const client = clientId ? oauthClient(clientId) : null;
  if (!client) throw new OAuthError("unauthorized_client", "Cliente OAuth no reconocido.");
  if (!redirectUri || !client.redirectUris.includes(redirectUri)) throw new OAuthError("invalid_request", "redirect_uri no autorizado.");
  if (resource !== `${origin}/api/mcp`) throw new OAuthError("invalid_target", "El recurso MCP no coincide.");
  if (!codeChallenge || params.get("code_challenge_method") !== "S256") throw new OAuthError("invalid_request", "Se requiere PKCE S256.");
  return { clientId: client.clientId, redirectUri, resource, codeChallenge, scopes: parseScopes(params.get("scope")), state: params.get("state") };
}

export async function issueAuthorizationCode(userId: string, request: ReturnType<typeof validateAuthorizeRequest>) {
  const code = randomSecret();
  await prisma.oAuthAuthorizationCode.create({
    data: { codeHash: hashSecret(code), userId, clientId: request.clientId, redirectUri: request.redirectUri, scopes: request.scopes.join(" "), resource: request.resource, codeChallenge: request.codeChallenge, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });
  return code;
}

function validPkce(verifier: string, challenge: string) {
  const computed = hashSecret(verifier);
  return computed.length === challenge.length && timingSafeEqual(Buffer.from(computed), Buffer.from(challenge));
}

export async function exchangeAuthorizationCode(input: { code: string; redirectUri: string; clientId: string; codeVerifier: string }) {
  const record = await prisma.oAuthAuthorizationCode.findUnique({ where: { codeHash: hashSecret(input.code) } });
  if (!record || record.usedAt || record.expiresAt <= new Date() || record.clientId !== input.clientId || record.redirectUri !== input.redirectUri || !validPkce(input.codeVerifier, record.codeChallenge)) {
    throw new OAuthError("invalid_grant", "Código de autorización inválido, usado o vencido.");
  }
  const claimed = await prisma.oAuthAuthorizationCode.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count !== 1) throw new OAuthError("invalid_grant", "Código de autorización ya utilizado.");
  return issueTokens({ userId: record.userId, clientId: record.clientId, scopes: record.scopes, resource: record.resource });
}

async function issueTokens(data: { userId: string; clientId: string; scopes: string; resource: string }) {
  const accessToken = await createMcpAccessToken(data.userId, data.scopes.split(" ").filter((scope) => scope !== "offline_access"));
  const refreshToken = randomSecret();
  await prisma.$transaction([
    prisma.oAuthAccessToken.create({ data: { ...data, tokenHash: hashSecret(accessToken), expiresAt: new Date(Date.now() + MCP_ACCESS_TOKEN_TTL_MS) } }),
    prisma.oAuthRefreshToken.create({ data: { ...data, tokenHash: hashSecret(refreshToken), expiresAt: new Date(Date.now() + REFRESH_TTL_MS) } }),
  ]);
  return { access_token: accessToken, token_type: "Bearer", expires_in: MCP_ACCESS_TOKEN_TTL_MS / 1000, refresh_token: refreshToken, scope: data.scopes };
}

export async function refreshTokens(token: string, clientId: string) {
  const record = await prisma.oAuthRefreshToken.findUnique({ where: { tokenHash: hashSecret(token) } });
  if (!record || record.clientId !== clientId || record.revokedAt || record.expiresAt <= new Date()) throw new OAuthError("invalid_grant", "Refresh token inválido o vencido.");
  const revoked = await prisma.oAuthRefreshToken.updateMany({ where: { id: record.id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (revoked.count !== 1) throw new OAuthError("invalid_grant", "Refresh token ya utilizado.");
  return issueTokens(record);
}

export async function verifyOAuthAccessToken(token: string | undefined) {
  return verifyMcpAccessToken(token);
}
