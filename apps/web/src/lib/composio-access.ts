/** Apps de la migración GSC/GA: abiertas a toda cuenta activa (conectar, elegir, probar y desconectar). */
const MIGRATION_APPS = new Set(["google_search_console", "google_analytics"]);

export function isMigrationApp(app: unknown): boolean {
  return typeof app === "string" && MIGRATION_APPS.has(app);
}
