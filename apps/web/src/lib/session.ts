const SESSION_COOKIE = "auto_articulos_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 días

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no está configurada.");
  return secret;
}

async function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(getSecret());
  return crypto.subtle.importKey("raw", enc, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Usa Web Crypto (crypto.subtle) en lugar del módulo "crypto" de Node porque
 * este archivo se importa tanto desde el middleware (Edge Runtime) como desde
 * route handlers (Node runtime), y Web Crypto es la única API común a ambos.
 */
export async function createSessionToken(userId: string): Promise<string> {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${expires}`;
  const key = await getKey();
  const signatureBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${toBase64Url(signatureBuf)}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresStr, signature] = parts;

  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return null;

  const payload = `${userId}.${expiresStr}`;
  const key = await getKey();
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(signature).buffer as ArrayBuffer,
    new TextEncoder().encode(payload)
  );

  return valid ? userId : null;
}

export { SESSION_COOKIE };
