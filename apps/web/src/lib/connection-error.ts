const CONNECTION_HELP_URL = "https://auto-articulos-web.vercel.app/resolucion-conexion";

/** Converts the legacy stored login error into the current actionable message. */
export function normalizeConnectionError(message: string | null | undefined): string | null {
  if (!message) return message ?? null;
  if (!/No se pudo iniciar sesión en\s+https?:\/\//i.test(message)) return message;
  const server = /10minuteswebsite\.site/i.test(message) ? "site" : /tagcrush/i.test(message) ? "tagcrush" : "net";
  return `No pude publicar, tienes un problema de conexión que debes resolver aquí: ${CONNECTION_HELP_URL}?server=${server}`;
}
