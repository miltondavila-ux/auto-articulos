import { prisma } from "@auto-articulos/db";

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
const OPPORTUNITY_RETRY_NOTE =
  "No se publicó en el primer intento y quedó disponible en Oportunidades para reintentarlo.";

async function finalizeStuckTitle(titleId: string, message: string) {
  await prisma.$transaction(async (tx) => {
    const title = await tx.title.findUnique({
      where: { id: titleId },
      select: { runId: true, text: true },
    });
    if (!title) return;

    const run = await tx.run.findUnique({
      where: { id: title.runId },
      select: { userId: true, categoryId: true },
    });
    if (!run) return;

    const group = await tx.opportunityGroup.upsert({
      where: { userId_categoryId: { userId: run.userId, categoryId: run.categoryId } },
      create: {
        userId: run.userId,
        categoryId: run.categoryId,
        rationale: "Títulos pendientes de publicación; puedes reintentarlos desde aquí.",
      },
      update: {},
      select: { id: true },
    });

    const existing = await tx.opportunityTitle.findFirst({
      where: { groupId: group.id, text: title.text },
      select: { id: true },
    });
    if (existing) {
      await tx.opportunityTitle.update({
        where: { id: existing.id },
        data: { rationale: OPPORTUNITY_RETRY_NOTE },
      });
    } else {
      await tx.opportunityTitle.create({
        data: { groupId: group.id, text: title.text, rationale: OPPORTUNITY_RETRY_NOTE },
      });
    }

    await tx.title.update({
      where: { id: titleId },
      data: { status: "error", errorMessage: message, processedAt: new Date() },
    });
  });
}

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

    // Un proceso huérfano ya no tiene una sesión que pueda continuar. Se
    // cierra como error recuperable y se conserva la oportunidad para que el
    // usuario decida cuándo reintentarlo, evitando un estado "running"
    // infinito o una oportunidad desaparecida.
    await finalizeStuckTitle(title.id, message);
    const remaining = await prisma.title.count({
      where: { runId: title.runId, status: { in: ["pending", "processing"] } },
    });
    if (remaining === 0) {
      await prisma.run.updateMany({
        where: { id: title.runId, status: { in: ["pending", "running"] } },
        data: { status: "halted", finishedAt: new Date() },
      });
    }
    await prisma.titleEvent.create({
      data: { titleId: title.id, message: `Error: ${message}` },
    });
    recovered++;
  }
  return recovered;
}

// Mismo bug de fondo que recoverStuckTitles(), pero para CategorySyncJob y
// LanguageSyncJob: si el worker muere a mitad de un job (confirmado en
// producción el 14/8/2026, corrida 31839053190: "Timed out fetching a new
// connection from the connection pool" cuando varios shards compitieron por
// el pool de Postgres), el job queda en "running" para siempre — a
// diferencia de Title, nada lo recupera. Es peor que quedar solo "atascado":
// POST /api/categories/sync y /api/languages/sync reutilizan cualquier job
// existente en estado "pending"/"running" en vez de crear uno nuevo, así que
// un job muerto bloquea TODOS los reintentos futuros del usuario (cada click
// en "Sincronizar" vuelve a mostrar el mismo job que nunca va a terminar).
// Debe coincidir con STUCK_SYNC_JOB_MS en apps/web/src/lib/sync-jobs.ts —
// subido de 3 a 20 minutos el 18/8/2026 (caso Wendy Chawa: un sync
// genuinamente en curso, no muerto, tardó 8.3 min y se marcó "atascado"
// antes de terminar; ver comentario completo en ese archivo).
const STUCK_SYNC_JOB_MS = 20 * 60 * 1000; // 20 minutos

// Mismo bug de fondo que recoverStuckTitles(), pero nunca se implementó para
// SocialOpportunity: a diferencia de un Título, si el worker muere a mitad
// de una publicación social (o si el disparo del worker falla en silencio
// tras encolarla), queda en "processing"/"queued" para siempre — nada la
// vuelve a tomar y la fila en Historial se queda mostrando "En proceso"
// indefinidamente, sin ningún error visible ni forma de reintentar (el botón
// "Reintentar" solo acepta status "pending"/"error"). Reportado por Milton
// el 30/8/2026 con un registro de LinkedIn atascado desde el 25/8/2026.
export async function recoverStuckSocialOpportunities(): Promise<number> {
  const cutoff = new Date(Date.now() - STUCK_PROCESSING_MS);
  const message =
    "El proceso se interrumpió de forma inesperada (posible caída de la base de datos o del worker) y quedó atascado; se recupera automáticamente. Puedes reintentarlo.";

  const stuck = await prisma.socialOpportunity.findMany({
    where: {
      OR: [
        { status: "processing", startedAt: { lt: cutoff } },
        // "queued" también se mide desde startedAt (el endpoint de publicar
        // lo actualiza al encolar/reintentar), NO desde createdAt: un
        // registro viejo reintentado tiene createdAt de hace días, lo que
        // lo marcaría como "atascado" casi al instante en vez de dejarle
        // los 10 minutos reales para que el worker lo tome.
        { status: "queued", startedAt: { lt: cutoff } },
        // Por si algún registro "queued" nunca llegó a tener startedAt
        // (no debería pasar con el flujo actual, pero por seguridad se usa
        // createdAt como respaldo solo quien nunca fue tocado).
        { status: "queued", startedAt: null, createdAt: { lt: cutoff } },
      ],
    },
    select: { id: true, titleId: true },
  });

  if (stuck.length === 0) return 0;

  await prisma.$transaction([
    prisma.socialOpportunity.updateMany({
      where: { id: { in: stuck.map((s) => s.id) } },
      data: { status: "error", errorLog: message, finishedAt: new Date() },
    }),
    prisma.titleEvent.createMany({
      data: stuck
        .filter((s): s is { id: string; titleId: string } => Boolean(s.titleId))
        .map((s) => ({ titleId: s.titleId, message: `Publicación en redes: ${message}` })),
    }),
  ]);

  return stuck.length;
}

export async function recoverStuckSyncJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - STUCK_SYNC_JOB_MS);
  const message =
    "El proceso se interrumpió de forma inesperada (posible caída del worker) y quedó atascado; vuelve a presionar el botón de sincronizar.";

  const [categoryJobs, languageJobs] = await Promise.all([
    prisma.categorySyncJob.updateMany({
      where: { status: "running", createdAt: { lt: cutoff } },
      data: { status: "error", errorMessage: message, finishedAt: new Date() },
    }),
    prisma.languageSyncJob.updateMany({
      where: { status: "running", createdAt: { lt: cutoff } },
      data: { status: "error", errorMessage: message, finishedAt: new Date() },
    }),
  ]);

  return categoryJobs.count + languageJobs.count;
}
