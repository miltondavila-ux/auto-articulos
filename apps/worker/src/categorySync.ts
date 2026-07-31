import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";
import { fetchCategories } from "./automation/10minutesWebsite";
import { tryReserveUser, releaseUser } from "./reservation";

/**
 * Procesa un único job de sincronización de categorías pendiente. Devuelve
 * true si hizo algo.
 *
 * Igual que `processNext()` en queue.ts: se salta jobs cuyo usuario ya esté
 * reservado (por ejemplo, si ese mismo usuario tiene un título publicándose
 * en este momento), para no abrir una segunda sesión contra la misma cuenta
 * de 10minutesWebsite en paralelo.
 */
export async function processNextCategorySync(): Promise<boolean> {
  const candidates = await prisma.categorySyncJob.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  let job: (typeof candidates)[number] | null = null;
  for (const candidate of candidates) {
    if (tryReserveUser(candidate.userId)) {
      job = candidate;
      break;
    }
  }
  if (!job) return false;

  await prisma.categorySyncJob.update({
    where: { id: job.id },
    data: { status: "running" },
  });

  try {
    const credential = await prisma.credential.findUnique({
      where: { userId_platform: { userId: job.userId, platform: "10minutesWebsite" } },
    });
    if (!credential) {
      throw new Error("Primero debes guardar tus credenciales de 10minutesWebsite.");
    }

    const username = decryptSecret(credential.encryptedUsername);
    const password = decryptSecret(credential.encryptedPassword);
    const remoteCategories = await fetchCategories({ username, password });

    for (const cat of remoteCategories) {
      await prisma.category.upsert({
        where: {
          userId_platform_externalId: {
            userId: job.userId,
            platform: "10minutesWebsite",
            externalId: cat.externalId,
          },
        },
        create: {
          userId: job.userId,
          platform: "10minutesWebsite",
          externalId: cat.externalId,
          name: cat.name,
        },
        update: { name: cat.name },
      });
    }

    await prisma.categorySyncJob.update({
      where: { id: job.id },
      data: { status: "success", finishedAt: new Date() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.categorySyncJob.update({
      where: { id: job.id },
      data: { status: "error", errorMessage: message, finishedAt: new Date() },
    });
  } finally {
    releaseUser(job.userId);
  }

  return true;
}
