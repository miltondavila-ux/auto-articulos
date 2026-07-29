import { prisma } from "@auto-articulos/db";
import { decryptSecret, MAX_ATTEMPTS } from "@auto-articulos/shared";
import { publishArticle } from "./automation/10minutesWebsite";

async function haltRun(runId: string, titleId: string, message: string) {
  await prisma.title.update({
    where: { id: titleId },
    data: { status: "error", errorMessage: message, processedAt: new Date() },
  });
  await prisma.run.update({
    where: { id: runId },
    data: { status: "halted", finishedAt: new Date() },
  });
}

/** Procesa un único título del run activo más antiguo. Devuelve true si hizo algo. */
export async function processNext(): Promise<boolean> {
  const run = await prisma.run.findFirst({
    where: { status: "running" },
    orderBy: { createdAt: "asc" },
    include: { category: true },
  });
  if (!run) return false;

  const nextTitle = await prisma.title.findFirst({
    where: { runId: run.id, status: "pending" },
    orderBy: { order: "asc" },
  });

  if (!nextTitle) {
    await prisma.run.update({
      where: { id: run.id },
      data: { status: "success", finishedAt: new Date() },
    });
    return true;
  }

  const credential = await prisma.credential.findUnique({
    where: { userId_platform: { userId: run.userId, platform: "10minutesWebsite" } },
  });

  if (!credential) {
    await haltRun(run.id, nextTitle.id, "No se encontraron credenciales de 10minutesWebsite para este usuario.");
    return true;
  }

  const updated = await prisma.title.update({
    where: { id: nextTitle.id },
    data: { status: "processing", attempts: { increment: 1 } },
  });

  const onStep = async (message: string) => {
    await prisma.titleEvent.create({ data: { titleId: nextTitle.id, message } });
  };

  await onStep(`Intento ${updated.attempts} de ${MAX_ATTEMPTS}...`);

  try {
    const username = decryptSecret(credential.encryptedUsername);
    const password = decryptSecret(credential.encryptedPassword);
    const result = await publishArticle(
      { username, password },
      nextTitle.text,
      run.category.externalId,
      { disableIndexing: run.disableIndexing },
      onStep
    );

    await prisma.title.update({
      where: { id: nextTitle.id },
      data: {
        status: "success",
        articleUrl: result.articleUrl,
        processedAt: new Date(),
        errorMessage: null,
      },
    });
    await onStep("Artículo publicado con éxito.");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const fresh = await prisma.title.findUniqueOrThrow({ where: { id: nextTitle.id } });
    await onStep(`Error: ${message}`);

    if (fresh.attempts >= MAX_ATTEMPTS) {
      await haltRun(run.id, nextTitle.id, message);
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
