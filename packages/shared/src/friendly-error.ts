/**
 * Clasificador único de errores técnicos (conexión y publicación).
 * Sin dependencias: lo usan la web (pantallas de cliente) y el worker.
 * Cada consumidor pone sus propios textos en español según el tipo.
 */
export type ErrorKind =
  | "SCOPE"       // falta un permiso que la persona no marcó
  | "EXPIRED"     // autorización vencida o retirada
  | "NO_ACCESS"   // sin permiso sobre ese sitio, Página o cuenta
  | "GONE"        // la conexión ya no existe en el proveedor
  | "BUSY"        // límite de uso o cuota
  | "DUPLICATE"   // publicación repetida
  | "MEDIA"       // la red no aceptó la imagen o el enlace
  | "UNREACHABLE"; // la red no respondió

export function classifyTechnicalError(raw: unknown): ErrorKind | null {
  const text = typeof raw === "string" ? raw : raw instanceof Error ? raw.message : "";
  const t = text.toLowerCase();
  if (!t) return null;
  if (t.includes("scope_insufficient") || t.includes("insufficient authentication scopes") || t.includes("insufficientpermissions") || /\(#200\)|pages_manage_posts|requires .*permission|permission.*required|missing permission/.test(t)) return "SCOPE";
  if (t.includes("invalid_grant") || t.includes("unauthenticated") || t.includes("invalid credentials") || t.includes("token has been expired") || t.includes("error validating access token") || t.includes("session has expired") || t.includes("token expired") || t.includes("expired token") || /\(#190\)|\boauthexception\b/.test(t) || /\b401\b/.test(t)) return "EXPIRED";
  if (t.includes("could not find connected account") || (t.includes("connected account") && t.includes("not found"))) return "GONE";
  if (t.includes("permission_denied") || t.includes("does not have sufficient permission") || /\b403\b/.test(t)) return "NO_ACCESS";
  if (t.includes("quota") || t.includes("rate limit") || t.includes("resource_exhausted") || t.includes("too many") || /\(#(4|17|32|613)\)/.test(t) || /\b429\b/.test(t)) return "BUSY";
  if (t.includes("duplicate") || t.includes("already posted") || t.includes("already exists")) return "DUPLICATE";
  if (t.includes("image") || t.includes("media") || t.includes("aspect ratio") || t.includes("file size") || t.includes("could not fetch") || t.includes("unable to fetch") || t.includes("invalid url")) return "MEDIA";
  if (/\b5\d\d\b/.test(t) || t.includes("timeout") || t.includes("timed out") || t.includes("econn") || t.includes("fetch failed") || t.includes("network")) return "UNREACHABLE";
  return null;
}

/** ¿El texto ya está escrito en español para una persona? */
export function looksSpanish(text: string): boolean {
  return /[áéíóúñ¿¡]/i.test(text) || /\b(el|la|los|las|de|del|tu|tus|una|un|que|no|se|para|con|por|elige|intenta|conexión|autorización)\b/i.test(text);
}

/** Corta la cola técnica de un mensaje en español («…: {json}», «…: <html>»). */
export function stripTechnicalTail(text: string): string {
  const cut = text.search(/:\s*[\[{<]|\s\{|\s\[\{|<html|https?:\/\/\S{60,}/i);
  const clean = cut > 12 ? text.slice(0, cut).trim() : text.trim();
  return clean.replace(/[:\s]+$/, "") + (clean.endsWith(".") ? "" : ".");
}

const PUBLISH_MESSAGES: Record<ErrorKind, string> = {
  SCOPE: "Falta un permiso en la red. Ve a Conexiones, vuelve a conectar la cuenta y deja marcadas todas las casillas de permisos.",
  EXPIRED: "La autorización de esta red venció o fue retirada. Ve a Conexiones y vuelve a conectarla.",
  NO_ACCESS: "Tu cuenta no tiene permiso para publicar ahí. Comprueba que eres administrador de la Página o cuenta elegida.",
  GONE: "Esa conexión ya no existe. Ve a Conexiones, desconéctala y vuelve a conectar.",
  BUSY: "La red está limitando las publicaciones por ahora. Se reintentará más tarde.",
  DUPLICATE: "La red rechazó la publicación por repetida. Genera una propuesta nueva.",
  MEDIA: "La red no aceptó la imagen o el enlace de esta publicación. Prueba con otra propuesta.",
  UNREACHABLE: "No pudimos comunicarnos con la red. Se reintentará más tarde.",
};

function networkLabel(platform: string): string {
  const p = platform.toLowerCase();
  if (p.startsWith("instagram")) return "Instagram";
  if (p.startsWith("facebook")) return "Facebook";
  const names: Record<string, string> = {
    threads: "Threads", linkedin: "LinkedIn", pinterest: "Pinterest", tumblr: "Tumblr",
    bluesky: "Bluesky", devto: "DEV.to", blogger: "Blogger", x: "X", "google-business-profile": "Google Business Profile", gbp: "Google Business Profile",
  };
  return names[p] ?? platform;
}

/** Mensaje claro, en español y sin códigos, para una publicación que falló. */
export function friendlyPublishError(raw: unknown, platform = "la red"): string {
  const network = networkLabel(platform);
  const text = typeof raw === "string" ? raw.trim() : raw instanceof Error ? raw.message.trim() : "";
  const generic = `No se pudo publicar en ${network}. Se reintentará más tarde; si sigue igual, reconecta la red en Conexiones.`;
  if (!text) return generic;
  const kind = classifyTechnicalError(text);
  if (kind) return PUBLISH_MESSAGES[kind];
  if (!looksSpanish(text)) return generic;
  return stripTechnicalTail(text).replace(/composio/gi, "el proveedor de conexiones");
}
