/**
 * Convierte cualquier error técnico (JSON de Google, códigos, HTTP) en un mensaje
 * claro en español para la persona usuaria. Nunca devuelve JSON ni códigos.
 */
const MISSING_PERMISSION =
  "Falta un permiso de Google. Pulsa «Desconectar», vuelve a conectar y deja marcadas todas las casillas de permisos.";
const EXPIRED = "Tu autorización de Google venció o fue retirada. Vuelve a conectar tu cuenta.";
const NO_ACCESS_TO_SITE =
  "Tu cuenta de Google no tiene permiso sobre ese sitio. Elige un sitio del que seas propietario o usa otra cuenta de Google.";
const BUSY = "Google está muy ocupado en este momento. Inténtalo de nuevo en unos minutos.";
const GONE = "Esa conexión ya no existe en el proveedor. Pulsa «Desconectar» y vuelve a conectar.";
const UNREACHABLE = "No pudimos comunicarnos con Google. Inténtalo de nuevo en unos minutos.";

export function friendlyConnectionError(raw: unknown, fallback: string): string {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return fallback;
  const t = text.toLowerCase();

  if (t.includes("scope_insufficient") || t.includes("insufficient authentication scopes") || t.includes("insufficientpermissions")) {
    return MISSING_PERMISSION;
  }
  if (t.includes("invalid_grant") || t.includes("unauthenticated") || t.includes("invalid credentials") || t.includes("token has been expired") || /\b401\b/.test(t)) {
    return EXPIRED;
  }
  if (t.includes("permission_denied") || t.includes("does not have sufficient permission") || /\b403\b/.test(t)) {
    return NO_ACCESS_TO_SITE;
  }
  if (t.includes("could not find connected account") || t.includes("connected account") && t.includes("not found")) {
    return GONE;
  }
  if (t.includes("quota") || t.includes("rate limit") || t.includes("resource_exhausted") || /\b429\b/.test(t)) {
    return BUSY;
  }
  if (/\b5\d\d\b/.test(t) || t.includes("timeout") || t.includes("timed out") || t.includes("econn") || t.includes("fetch failed")) {
    return UNREACHABLE;
  }
  // Cualquier resto que parezca técnico (JSON, llaves, códigos) no se muestra.
  if (/[{}\[\]]/.test(text) || t.includes("\"error\"") || t.includes("googleapis.com") || /\b[a-z_]{6,}\b.*_[a-z_]{3,}/.test(text) && text === text.toUpperCase()) {
    return fallback;
  }
  // Solo se muestra texto que ya esté en español; cualquier mensaje técnico en inglés usa el respaldo.
  const looksSpanish = /[áéíóúñ¿¡]/i.test(text) || /\b(el|la|los|las|de|del|tu|tus|una|un|que|no|se|para|con|por|elige|intenta|conexión)\b/i.test(text);
  return looksSpanish ? text.replace(/composio/gi, "el proveedor de conexiones") : fallback;
}
