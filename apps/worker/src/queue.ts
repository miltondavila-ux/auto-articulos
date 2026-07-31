import { prisma, Prisma } from "@auto-articulos/db";
import { decryptSecret, MAX_ATTEMPTS } from "@auto-articulos/shared";
import { publishArticle } from "./automation/10minutesWebsite";
import { tryReserveUser, releaseUser } from "./reservation";
import { notifyGoogle } from "./googleIndexing";

async function markTitleError(titleId: string, message: string) {
  await prisma.title.update({
    where: { id: titleId },
    data: { status: "error", errorMessage: message, processedAt: new Date() },
  });
}

/**
 * Procesa un único título de algún run activo. Devuelve true si hizo algo.
 *
 * Puede llamarse desde varios "lanes" concurrentes (ver run-once.ts): cada
 * llamada toma el run activo más antiguo cuyo usuario no esté ya reservado
 * por otro lane, para que distintos usuarios avancen en paralelo sin que dos
 * lanes abran sesión en la MISMA cuenta de 10minutesWebsite al mismo tiempo.
 */
export async function processNext(): Promise<boolean> {
  const candidates = await prisma.run.findMany({
    where: { status: "running" },
    orderBy: { createdAt: "asc" },
    include: { category: true },
    take: 20,
  });

  type RunWithCategory = (typeof candidates)[number];
  let run: RunWithCategory | null = null;
  for (const candidate of candidates) {
    if (tryReserveUser(candidate.userId)) {
      run = candidate;
      break;
    }
  }
  if (!run) return false;

  try {
    return await processRunTitle(run);
  } finally {
    releaseUser(run.userId);
  }
}

async function processRunTitle(
  run: Prisma.RunGetPayload<{ include: { category: true } }>,
): Promise<boolean> {
  const nextTitle = await prisma.title.findFirst({
    where: { runId: run.id, status: "pending" },
    orderBy: { order: "asc" },
  });

  if (!nextTitle) {
    // Ya no quedan títulos pendientes: el lote terminó. Si alguno quedó en
    // "error", el run pasa a "halted" — no porque se haya detenido a mitad
    // de camino (ya se procesaron todos los que se podían), sino para que
    // quede a la espera de que el usuario decida si reintenta esos títulos
    // puntuales (botón "Reintentar" en Inicio/Historial).
    const errorCount = await prisma.title.count({
      where: { runId: run.id, status: "error" },
    });
    await prisma.run.updateMany({
      where: { id: run.id, status: { in: ["pending", "running"] } },
      data: {
        status: errorCount > 0 ? "halted" : "success",
        finishedAt: new Date(),
      },
    });
    return true;
  }

  const credential = await prisma.credential.findUnique({
    where: {
      userId_platform: { userId: run.userId, platform: "10minutesWebsite" },
    },
  });

  if (!credential) {
    // Sin credenciales, NINGÚN título de este lote puede avanzar — este sí
    // es un caso real para detener todo de una vez, en vez de ir marcando
    // título por título el mismo error.
    await markTitleError(
      nextTitle.id,
      "No se encontraron credenciales de 10minutesWebsite para este usuario.",
    );
    await prisma.run.updateMany({
      where: { id: run.id, status: { in: ["pending", "running"] } },
      data: { status: "halted", finishedAt: new Date() },
    });
    return true;
  }

  const updated = await prisma.title.update({
    where: { id: nextTitle.id },
    data: { status: "processing", attempts: { increment: 1 } },
  });

  const onStep = async (message: string) => {
    await prisma.titleEvent.create({
      data: { titleId: nextTitle.id, message },
    });
  };

  await onStep(`Intento ${updated.attempts} de ${MAX_ATTEMPTS}...`);

  try {
    const username = decryptSecret(credential.encryptedUsername);
    const password = decryptSecret(credential.encryptedPassword);
    const result = await publishArticle(
      { username, password },
      nextTitle.text,
      run.category.externalId,
      run.disableIndexing,
      onStep,
    );

    // Si no se pudo confirmar el enlace real, no lo reportamos como éxito:
    // así se reintenta o se detiene el run, en vez de quedar "Publicado"
    // con un enlace vacío sin que nadie se entere.
    if (!result.articleUrl) {
      throw new Error(
        "El artículo no aparece en el listado tras guardar: es probable que no se haya publicado.",
      );
    }

    await prisma.title.update({
      where: { id: nextTitle.id },
      data: {
        status: "success",
        articleUrl: result.articleUrl,
        finalTitle: result.finalTitle,
        processedAt: new Date(),
        errorMessage: null,
      },
    });
    await onStep("Artículo publicado con éxito.");
    await notifyGoogle(nextTitle.id, run.userId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const [fresh, freshRun] = await Promise.all([
      prisma.title.findUniqueOrThrow({ where: { id: nextTitle.id } }),
      prisma.run.findUniqueOrThrow({ where: { id: run.id } }),
    ]);
    await onStep(`Error: ${message}`);

    if (freshRun.status === "cancelled") {
      // El usuario canceló el run mientras este título estaba en curso: no
      // lo reintentamos ni lo marcamos como error, queda como cancelado.
      await prisma.title.update({
        where: { id: nextTitle.id },
        data: { status: "cancelled", errorMessage: message },
      });
    } else if (fresh.attempts >= MAX_ATTEMPTS) {
      // Se acabaron los intentos para ESTE título, pero el lote sigue: el
      // worker continúa con los demás títulos pendientes del mismo run.
      await markTitleError(nextTitle.id, message);
    } else {
      // Vuelve a "pending" para reintentar desde el inicio en el próximo ciclo.
      await prisma.title.update({
        where: { id: nextTitle.id },
        data: { status: "pending", errorMessage: message },
      });
    }
  }

  return true;
}
