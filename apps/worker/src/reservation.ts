import { prisma } from "@auto-articulos/db";

// Reserva de qué usuarios tienen una sesión de 10minutesWebsite en uso ahora
// mismo — publicando un título o sincronizando categorías. Evita abrir dos
// sesiones concurrentes contra la MISMA cuenta: muchos sitios invalidan la
// sesión anterior si detectan un segundo login, lo que rompería el trabajo
// que ya estaba en curso.
//
// Pedido explícito del usuario (31/7/2026): pasar de un solo worker a VARIOS
// corriendo en paralelo (GitHub Actions con matriz de shards, ver
// worker.yml) para atender ~40 usuarios activos sin que el trabajo de unos
// espere el de otros. Con eso, la reserva YA NO puede vivir en memoria de un
// solo proceso (eso solo coordinaba "lanes" dentro del mismo proceso) — cada
// shard es un proceso de Node completamente separado. Ahora el "claim" es un
// UPDATE atómico condicional sobre `User.workerBusyUntil` en la base de
// datos: solo UN proceso puede poner esa columna en `pending -> busy` a la
// vez, sin importar cuántos shards compitan por el mismo usuario.
//
// El vencimiento (TTL) es una red de seguridad: si un proceso muere (ej. el
// runner de GitHub Actions se cae) sin liberar la reserva, otro shard puede
// tomarla de nuevo pasado ese tiempo en vez de dejar al usuario bloqueado
// para siempre.
const LOCK_TTL_MS = 5 * 60 * 1000;

export async function tryReserveUser(userId: string): Promise<boolean> {
  const now = new Date();
  const busyUntil = new Date(now.getTime() + LOCK_TTL_MS);

  const claim = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [{ workerBusyUntil: null }, { workerBusyUntil: { lt: now } }],
    },
    data: { workerBusyUntil: busyUntil },
  });

  return claim.count === 1;
}

export async function releaseUser(userId: string): Promise<void> {
  await prisma.user.updateMany({
    where: { id: userId },
    data: { workerBusyUntil: null },
  });
}
