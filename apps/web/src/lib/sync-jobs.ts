/**
 * Reglas compartidas para decidir cuándo un job de sincronización
 * (CategorySyncJob / LanguageSyncJob) dejó de estar realmente en curso.
 *
 * Bug real de producción (14/8/2026, reportado con la cuenta de Estee Soto):
 * si el worker muere a mitad de un job — por ejemplo con el P2024 de la
 * corrida 31839053190, "Timed out fetching a new connection from the
 * connection pool" — el job queda en "running" para siempre, porque el
 * worker solo recoge jobs en "pending". Como las rutas de sincronización
 * reutilizaban cualquier job "pending"/"running" existente en vez de crear
 * uno nuevo, ese job muerto bloqueaba TODOS los reintentos futuros: cada vez
 * que la persona pulsaba "Sincronizar" se le devolvía el mismo job que ya
 * nunca iba a terminar, y el Paso 2 del wizard se quedaba sin categorías
 * para siempre, sin mostrar ni éxito ni error.
 *
 * El worker también recupera estos jobs al inicio de cada corrida (ver
 * recoverStuckSyncJobs en apps/worker/src/cleanup.ts), pero eso puede tardar
 * porque las corridas se serializan y encolar un runner de GitHub Actions ha
 * llegado a tomar 14 minutos. Aplicar el mismo criterio aquí, en el momento
 * del clic, hace que el desbloqueo sea inmediato para quien está esperando.
 */
export const STUCK_SYNC_JOB_MS = 10 * 60 * 1000;

export const STUCK_SYNC_JOB_MESSAGE =
  "El intento anterior se interrumpió de forma inesperada y quedó atascado. Se descartó automáticamente para que este nuevo intento pueda ejecutarse.";

export function isStuckSyncJob(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() > STUCK_SYNC_JOB_MS;
}
