import { prisma } from "@auto-articulos/db";
import { decryptSecret, platformProductNameOrNeutral } from "@auto-articulos/shared";
import { fetchLanguages } from "./automation/10minutesWebsite";
import { tryReserveUser, releaseUser } from "./reservation";

/**
 * Procesa un único job de sincronización de idiomas pendiente. Igual que
 * processNextCategorySync() en categorySync.ts (mismo patrón, aislado en su
 * propio archivo/lane a propósito: si algo falla acá nunca afecta la
 * sincronización de categorías, que ya es confiable en producción).
 */
export async function processNextLanguageSync(filterUserId?: string): Promise<boolean> {
  const candidates = await prisma.languageSyncJob.findMany({
    where: { status: "pending", ...(filterUserId ? { userId: filterUserId } : {}) },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  let job: (typeof candidates)[number] | null = null;
  for (const candidate of candidates) {
    if (await tryReserveUser(candidate.userId)) {
      job = candidate;
      break;
    }
  }
  if (!job) return false;

  await prisma.languageSyncJob.update({
    where: { id: job.id },
    data: { status: "running" },
  });

  try {
    const [credential, user] = await Promise.all([
      prisma.credential.findUnique({
        where: { userId_platform: { userId: job.userId, platform: "10minutesWebsite" } },
      }),
      prisma.user.findUnique({
        where: { id: job.userId },
        select: { platformDomain: true },
      }),
    ]);
    if (!credential) {
      throw new Error(`Primero debes guardar tus credenciales de ${platformProductNameOrNeutral(user?.platformDomain)}.`);
    }

    const username = decryptSecret(credential.encryptedUsername);
    const password = decryptSecret(credential.encryptedPassword);
    const remoteLanguages = await fetchLanguages({
      username,
      password,
      platformDomain: user?.platformDomain,
    });

    for (const lang of remoteLanguages) {
      await prisma.language.upsert({
        where: {
          userId_platform_externalId: {
            userId: job.userId,
            platform: "10minutesWebsite",
            externalId: lang.externalId,
          },
        },
        create: {
          userId: job.userId,
          platform: "10minutesWebsite",
          externalId: lang.externalId,
          name: lang.name,
        },
        update: { name: lang.name },
      });
    }

    await prisma.languageSyncJob.update({
      where: { id: job.id },
      data: { status: "success", finishedAt: new Date() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.languageSyncJob.update({
      where: { id: job.id },
      data: { status: "error", errorMessage: message, finishedAt: new Date() },
    });
  } finally {
    await releaseUser(job.userId);
  }

  return true;
}
