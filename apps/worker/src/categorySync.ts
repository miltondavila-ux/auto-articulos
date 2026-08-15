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

    // RECONCILIAR, no solo sumar. Bug real de producción (15/8/2026, cuentas
    // de Estee Soto y Antonio Aguirre): antes esto solo hacía upsert y nunca
    // borraba, así que cualquier categoría guardada alguna vez (de
    // credenciales que después se corrigieron, de un intento fallido, de un
    // servidor equivocado) quedaba mezclada para siempre con las correctas —
    // sin ninguna forma de saber cuáles eran reales.
    //
    // Se reemplaza el conjunto "sync" completo en una transacción (todo o
    // nada: si algo falla, no queda a medio borrar) y se dejan intactas las
    // "manual", que la persona escribió a mano y no vienen del sitio.
    // Agrupadas por panel (null = cuenta sin la función de paneles, ver
    // Category.panel): la reconciliación borra solo lo viejo DEL MISMO panel,
    // nunca cruza paneles entre sí — si no, sincronizar "English" borraría
    // las categorías de "Español" que ese mismo intento ni siquiera tocó.
    const byPanel = new Map<string, RemoteCategory[]>();
    for (const cat of remoteCategories) {
      const list = byPanel.get(cat.panel) ?? [];
      list.push(cat);
      byPanel.set(cat.panel, list);
    }

    const operations = Array.from(byPanel.entries()).flatMap(
      ([panel, cats]) => [
        prisma.category.deleteMany({
          where: {
            userId: job.userId,
            platform: "10minutesWebsite",
            source: "sync",
            panel,
            externalId: { notIn: cats.map((c) => c.externalId) },
          },
        }),
        ...cats.map((cat) =>
          prisma.category.upsert({
            where: {
              userId_platform_panel_externalId: {
                userId: job.userId,
                platform: "10minutesWebsite",
                panel,
                externalId: cat.externalId,
              },
            },
            create: {
              userId: job.userId,
              platform: "10minutesWebsite",
              panel,
              externalId: cat.externalId,
              name: cat.name,
              isSequence: cat.isSequence,
              source: "sync",
            },
            update: { name: cat.name, isSequence: cat.isSequence, source: "sync" },
          }),
        ),
      ],
    );

    // Limpieza de transición: si ESTE sync sí detectó paneles, cualquier
    // categoría "sync" vieja marcada panel="" es basura de un intento
    // anterior de ANTES de que la detección de paneles funcionara para esta
    // cuenta (bug real de producción, 15/8/2026 — visto con Antonio Aguirre:
    // categorías sin etiqueta mezcladas con las recién sincronizadas). La
    // reconciliación de arriba nunca la toca porque solo limpia DENTRO de
    // cada panel detectado, nunca cruza a "sin panel". Una cuenta con
    // paneles no debería tener nunca categorías "sync" sin panel.
    if (byPanel.size > 0 && !byPanel.has("")) {
      operations.push(
        prisma.category.deleteMany({
          where: {
            userId: job.userId,
            platform: "10minutesWebsite",
            source: "sync",
            panel: "",
          },
        }),
      );
    }

    await prisma.$transaction(operations);

    await prisma.categorySyncJob.update({
      where: { id: job.id },
      data: { status: "success", finishedAt: new Date() },
    });
    // Único rastro visible en el log de esta corrida hasta ahora era la
    // corrección de servidor (arriba), que solo dispara cuando el servidor
    // guardado estaba mal. Un sync normal —exitoso o con 0 categorías—
    // quedaba completamente mudo, imposible de diagnosticar desde los logs
    // de GitHub Actions sin acceso a la base. Costó horas reales el
    // 15/8/2026 (caso de Estee Soto) buscar un rastro que nunca se escribió.
    console.log(
      `CategorySyncJob ${job.id} (usuario ${job.userId}): éxito, ${remoteCategories.length} categoría(s) en ${byPanel.size} panel(es) [${Array.from(byPanel.keys()).map((p) => p || "sin panel").join(", ")}].`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.categorySyncJob.update({
      where: { id: job.id },
      data: { status: "error", errorMessage: message, finishedAt: new Date() },
    });
    console.log(
      `CategorySyncJob ${job.id} (usuario ${job.userId}): error — ${message}`,
    );
  } finally {
    await releaseUser(job.userId);
  }

  return true;
}
