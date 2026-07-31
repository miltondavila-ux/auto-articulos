import { prisma } from "@auto-articulos/db";
import { MAX_ATTEMPTS } from "@auto-articulos/shared";

// El usuario pidió explícitamente (31/7/2026) mantener la base lo más
// liviana posible: el log completo (con capturas de diagnóstico en base64)
// solo sirve para depurar justo después de que algo pasa. Pasados unos
// días ya no hace falta guardarlo — el título conserva el resumen
// (status, articleUrl/finalTitle, errorMessage) sin necesidad del log
// paso a paso. No se toca el contenido del artículo en sí: nunca se guardó
// en la base (solo título, resumen corto y enlace).
const EVENT_RETENTION_DAYS = 7;

export async function cleanupOldEvents(): Promise<number> {
  const cutoff = new Date(
    Date.now() - EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const { count } = await prisma.titleEvent.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      title: { status: { notIn: ["pending", "processing"] } },
    },
  });
  return count;
}

// Bug real encontrado el 31/7/2026: si el worker se cae por algo externo
// (ej. la base de datos se vuelve inalcanzable a mitad de un intento), el
// título queda en "processing" para siempre — nadie lo vuelve a tomar
// (processNext() solo busca títulos "pending"), y no queda ningún mensaje
// de error visible para el usuario. Al inicio de cada corrida, se detectan
// títulos "processing" cuyo último evento es de hace rato y se recuperan:
// se reintentan si quedan intentos, o se marcan como error si no.
const STUCK_PROCESSING_MS = 10 * 60 * 1000; // 10 minutos

export async function recoverStuckTitles(): Promise<number> {
  const stuckTitles = await prisma.title.findMany({
    where: { status: "processing" },
    include: { events: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  let recovered = 0;
  for (const title of stuckTitles) {
    const lastActivity = title.events[0]?.createdAt ?? title.processedAt;
    if (
      lastActivity &&
      Date.now() - lastActivity.getTime() < STUCK_PROCESSING_MS
    ) {
      continue; // probablemente sigue corriendo de verdad, no tocar
    }

    const message =
      "El proceso se interrumpió de forma inesperada (posible caída de la base de datos o del worker) y quedó atascado; se recupera automáticamente.";

    if (title.attempts >= MAX_ATTEMPTS) {
      await prisma.title.update({
        where: { id: title.id },
        data: {
          status: "error",
          errorMessage: message,
          processedAt: new Date(),
        },
      });
      await prisma.run.updateMany({
        where: { id: title.runId, status: { in: ["pending", "running"] } },
        data: { status: "halted", finishedAt: new Date() },
      });
    } else {
      await prisma.title.update({
        where: { id: title.id },
        data: { status: "pending", errorMessage: message },
      });
    }
    await prisma.titleEvent.create({
      data: { titleId: title.id, message: `Error: ${message}` },
    });
    recovered++;
  }
  return recovered;
}
