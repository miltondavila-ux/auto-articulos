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
 *
 * Subido de 3 a 20 minutos el 18/8/2026 (caso real: Wendy Chawa). Con 3
 * minutos, un job que seguía genuinamente en curso —por ejemplo esperando en
 * cola de GitHub Actions (hasta 14 min documentados) más el tiempo real de
 * descargar categorías probando varios servidores— se declaraba "atascado"
 * y se descartaba antes de que tuviera oportunidad real de terminar. Su
 * sincronización tardó 500s (8.3 min) en total y sí funcionó: 24 categorías
 * guardadas correctamente, pero el mensaje de error prematuro quedó visible
 * y la hizo pensar que había fallado. 20 minutos da margen real sobre el
 * peor caso documentado sin dejar de recuperar jobs de verdad muertos.
 */
export const STUCK_SYNC_JOB_MS = 20 * 60 * 1000;

export const STUCK_SYNC_JOB_MESSAGE =
  "El intento anterior se interrumpió de forma inesperada y quedó atascado. Se descartó automáticamente para que este nuevo intento pueda ejecutarse.";

export function isStuckSyncJob(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() > STUCK_SYNC_JOB_MS;
}
