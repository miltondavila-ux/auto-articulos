import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  normalizePlatformDomain,
  PLATFORM_DOMAIN_VALUES,
  PLATFORM_SERVERS,
  type PlatformDomain,
} from "@auto-articulos/shared";
import {
  fetchCategories,
  type RemoteCategory,
} from "./automation/10minutesWebsite";
import { tryReserveUser, releaseUser } from "./reservation";

/**
 * Descarga las categorías averiguando, si hace falta, en qué servidor vive
 * realmente la cuenta.
 *
 * Nadie sabe de memoria a qué servidor pertenece cada correo: la plataforma
 * se sirve desde varios dominios (ver PLATFORM_SERVERS) y hasta ahora había
 * que acertarlo a mano en Administración. El caso de Estee Soto (14/8/2026)
 * lo dejó claro: su cuenta vive en tagcrush.net, el sistema la mandaba a
 * 10minuteswebsite.net, y el único síntoma era un login que fallaba sin que
 * nadie supiera por qué. Con decenas de usuarios, adivinarlo uno por uno no
 * es viable.
 *
 * Se prueba primero el servidor configurado — así, para las cuentas que ya
 * están bien (la enorme mayoría), el comportamiento y el costo son idénticos
 * a los de antes: acierta al primer intento y nunca abre un segundo
 * navegador. Solo si ese falla se prueban los demás.
 */
async function fetchCategoriesDetectingServer(
  username: string,
  password: string,
  configuredDomain: string | null | undefined,
): Promise<{ categories: RemoteCategory[]; platformDomain: PlatformDomain }> {
  const configured = normalizePlatformDomain(configuredDomain);
  const candidates: PlatformDomain[] = [
    configured,
    ...PLATFORM_DOMAIN_VALUES.filter((d) => d !== configured),
  ];

  let firstError: unknown = null;
  for (const platformDomain of candidates) {
    try {
      const categories = await fetchCategories({
        username,
        password,
        platformDomain,
      });
      return { categories, platformDomain };
    } catch (err) {
      // Se conserva el error del servidor CONFIGURADO: es el que describe el
      // problema real cuando ningún servidor funciona (por ejemplo, una
      // contraseña equivocada), y el que la persona espera leer.
      if (firstError === null) firstError = err;
    }
  }

  throw firstError ?? new Error("No se pudieron descargar las categorías.");
}

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
    if (await tryReserveUser(candidate.userId)) {
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
      throw new Error("Primero debes guardar tus credenciales de 10minutesWebsite.");
    }

    const username = decryptSecret(credential.encryptedUsername);
    const password = decryptSecret(credential.encryptedPassword);
    const { categories: remoteCategories, platformDomain: workingDomain } =
      await fetchCategoriesDetectingServer(
        username,
        password,
        user?.platformDomain,
      );

    // Si la cuenta resultó vivir en otro servidor, se recuerda: publicar y
    // sincronizar idiomas después usan User.platformDomain directamente, así
    // que sin guardarlo la detección habría que repetirla en cada operación.
    if (workingDomain !== normalizePlatformDomain(user?.platformDomain)) {
      await prisma.user.update({
        where: { id: job.userId },
        data: { platformDomain: workingDomain },
      });
      console.log(
        `Usuario ${job.userId}: su cuenta vive en ${PLATFORM_SERVERS[workingDomain].label}, no en el servidor que tenía configurado. Corregido automáticamente.`,
      );
    }

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
          isSequence: cat.isSequence,
        },
        update: { name: cat.name, isSequence: cat.isSequence },
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
    await releaseUser(job.userId);
  }

  return true;
}
