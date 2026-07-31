// Reserva en memoria (dentro de este mismo proceso) de qué usuarios tienen
// una sesión de 10minutesWebsite en uso ahora mismo — publicando un título o
// sincronizando categorías. Evita abrir dos sesiones concurrentes contra la
// MISMA cuenta: muchos sitios invalidan la sesión anterior si detectan un
// segundo login, lo que rompería el trabajo que ya estaba en curso.
//
// No hace falta que sea a nivel de base de datos: GitHub Actions ya
// garantiza que solo un proceso de este worker corre a la vez (ver
// `concurrency` en .github/workflows/worker.yml). Esto solo coordina los
// distintos "lanes" concurrentes dentro de ese único proceso, para poder
// avanzar el trabajo de varios usuarios distintos al mismo tiempo.
const activeUserIds = new Set<string>();

export function tryReserveUser(userId: string): boolean {
  if (activeUserIds.has(userId)) return false;
  activeUserIds.add(userId);
  return true;
}

export function releaseUser(userId: string): void {
  activeUserIds.delete(userId);
}
