/**
 * Convierte cualquier error técnico (JSON de Google, códigos, HTTP) en un mensaje
 * claro en español para la persona usuaria. Nunca devuelve JSON ni códigos.
 * El tipo de error lo decide el clasificador único del paquete compartido.
 */
import { classifyTechnicalError, looksSpanish, type ErrorKind } from "@auto-articulos/shared/src/friendly-error";

const CONNECTION_MESSAGES: Partial<Record<ErrorKind, string>> = {
  SCOPE: "Falta un permiso de Google. Pulsa «Desconectar», vuelve a conectar y deja marcadas todas las casillas de permisos.",
  EXPIRED: "Tu autorización venció o fue retirada. Vuelve a conectar tu cuenta.",
  NO_ACCESS: "Tu cuenta no tiene permiso sobre ese sitio o cuenta. Elige uno del que seas propietario o usa otra cuenta.",
  GONE: "Esa conexión ya no existe en el proveedor. Pulsa «Desconectar» y vuelve a conectar.",
  BUSY: "El servicio está muy ocupado en este momento. Inténtalo de nuevo en unos minutos.",
  UNREACHABLE: "No pudimos comunicarnos con el servicio. Inténtalo de nuevo en unos minutos.",
};

export function friendlyConnectionError(raw: unknown, fallback: string): string {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return fallback;
  const kind = classifyTechnicalError(text);
  if (kind && CONNECTION_MESSAGES[kind]) return CONNECTION_MESSAGES[kind] as string;
  // Cualquier resto que parezca técnico (JSON, llaves, códigos) no se muestra.
  if (/[{}\[\]]/.test(text) || text.toLowerCase().includes("\"error\"") || text.toLowerCase().includes("googleapis.com")) return fallback;
  // Solo se muestra texto que ya esté en español; cualquier mensaje técnico en inglés usa el respaldo.
  return looksSpanish(text) ? text.replace(/composio/gi, "el proveedor de conexiones") : fallback;
}
