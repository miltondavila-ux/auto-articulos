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

  // Mensaje honesto sobre lo que realmente se intentó. Antes se propagaba tal
  // cual el error del servidor configurado, que nombraba UN solo dominio
  // ("No se pudo iniciar sesión en https://10minuteswebsite.net") — daba a
  // entender que solo se había probado ahí, cuando en realidad ya se habían
  // probado TODOS. Encontrado con la cuenta de Stefany Meza (15/8/2026):
  // el mensaje mandaba a revisar el servidor asignado, cuando el problema
  // real era que las credenciales no servían en ninguno.
  const intentados = candidates
    .map((d) => PLATFORM_SERVERS[d].label)
    .join(", ");
  const detalle =
    firstError instanceof Error ? firstError.message : String(firstError ?? "");
  throw new Error(
    `No se pudo iniciar sesión con las credenciales guardadas en ninguno de los servidores disponibles (${intentados}). Lo más probable es que el usuario o la contraseña guardados en Configuración ya no sean válidos: verifícalos entrando a mano a tu plataforma y vuelve a guardarlos.${detalle ? ` Detalle técnico del primer intento: ${detalle}` : ""}`,
  );
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
export async function processNextCategorySync(filterUserId?: string): Promise<boolean> {
  const candidates = await prisma.categorySyncJob.findMany({
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
      throw new Error("Primero debes guardar tus credenciales de la plataforma.");
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

    // 1. Primero upsertamos todas las categorías remotas para asegurarnos de que existan y tengan ID.
    const upsertedCategories = await Promise.all(
      remoteCategories.map((cat) =>
        prisma.category.upsert({
          where: {
            userId_platform_panel_externalId: {
              userId: job.userId,
              platform: "10minutesWebsite",
              panel: cat.panel,
              externalId: cat.externalId,
            },
          },
          create: {
            userId: job.userId,
            platform: "10minutesWebsite",
            panel: cat.panel,
            externalId: cat.externalId,
            name: cat.name,
            isSequence: cat.isSequence,
            source: "sync",
          },
          update: { name: cat.name, isSequence: cat.isSequence, source: "sync" },
        }),
      ),
    );

    // 2. Traer las categorías que existen actualmente en la base de datos para este usuario.
    const existingCategories = await prisma.category.findMany({
      where: {
        userId: job.userId,
        platform: "10minutesWebsite",
      },
    });

    // 3. Determinar cuáles categorías se deberían borrar según las dos reglas de reconciliación:
    //    Regla A: Sincronizadas que ya no vienen en el reporte remoto del mismo panel.
    //    Regla B: Transición del panel vacío ("") si ahora sí se detectaron paneles.
    const categoriesToDelete = existingCategories.filter((c) => {
      if (c.source !== "sync") return false;

      const remoteCatsInPanel = byPanel.get(c.panel);
      if (remoteCatsInPanel) {
        return !remoteCatsInPanel.some((rc) => rc.externalId === c.externalId);
      }

      if (c.panel === "" && byPanel.size > 0 && !byPanel.has("")) {
        return true;
      }

      return false;
    });

    const categoriesToForceDeleteIds: string[] = [];
    const categoriesToArchiveIds: string[] = [];
    const runUpdates: { fromId: string; toId: string }[] = [];
    const oppGroupUpdates: { fromId: string; toId: string }[] = [];
    const oppGroupDeletes: string[] = [];

    // 4. Analizar dependencias de clave foránea para cada categoría que se debería borrar
    for (const catToDelete of categoriesToDelete) {
      const replacement = upsertedCategories.find(
        (rc) => rc.externalId === catToDelete.externalId,
      );

      if (replacement) {
        // Si hay un reemplazo activo (por ejemplo, misma categoría pero ahora con panel),
        // migramos las referencias de Run y OpportunityGroup.
        runUpdates.push({ fromId: catToDelete.id, toId: replacement.id });

        const hasOppGroupForReplacement = await prisma.opportunityGroup.findUnique({
          where: {
            userId_categoryId: {
              userId: job.userId,
              categoryId: replacement.id,
            },
          },
        });

        if (hasOppGroupForReplacement) {
          oppGroupDeletes.push(catToDelete.id);
        } else {
          oppGroupUpdates.push({ fromId: catToDelete.id, toId: replacement.id });
        }

        categoriesToForceDeleteIds.push(catToDelete.id);
      } else {
        // Si no hay reemplazo, verificamos si tiene corridas (Run) asociadas.
        const runsCount = await prisma.run.count({
          where: { categoryId: catToDelete.id },
        });

        if (runsCount > 0) {
          // Si tiene corridas, no la borramos para no violar la clave foránea e invalidar el historial;
          // en su lugar la marcamos como "archived".
          categoriesToArchiveIds.push(catToDelete.id);
        } else {
          // Si no tiene corridas, la borramos definitivamente (las OpportunityGroups se borran en cascada).
          categoriesToForceDeleteIds.push(catToDelete.id);
        }
      }
    }

    // 5. Ejecutar todas las operaciones de base de datos en una sola transacción
    const syncOperations: any[] = [];

    for (const update of runUpdates) {
      syncOperations.push(
        prisma.run.updateMany({
          where: { categoryId: update.fromId },
          data: { categoryId: update.toId },
        }),
      );
    }

    if (oppGroupDeletes.length > 0) {
      syncOperations.push(
        prisma.opportunityGroup.deleteMany({
          where: {
            userId: job.userId,
            categoryId: { in: oppGroupDeletes },
          },
        }),
      );
    }

    for (const update of oppGroupUpdates) {
      syncOperations.push(
        prisma.opportunityGroup.updateMany({
          where: {
            userId: job.userId,
            categoryId: update.fromId,
          },
          data: { categoryId: update.toId },
        }),
      );
    }

    if (categoriesToArchiveIds.length > 0) {
      syncOperations.push(
        prisma.category.updateMany({
          where: { id: { in: categoriesToArchiveIds } },
          data: { source: "archived" },
        }),
      );
    }

    if (categoriesToForceDeleteIds.length > 0) {
      syncOperations.push(
        prisma.category.deleteMany({
          where: { id: { in: categoriesToForceDeleteIds } },
        }),
      );
    }

    if (syncOperations.length > 0) {
      await prisma.$transaction(syncOperations);
    }

    // errorMessage: null es necesario porque el mismo job puede haber sido
    // marcado "error" de forma prematura por recoverStuckSyncJobs (ver
    // cleanup.ts) mientras seguía realmente en curso, y luego terminar solo
    // con éxito: sin este reseteo, un job en status="success" podía quedar
    // con el mensaje de "posible caída del worker" pegado para siempre
    // (caso real: Wendy Chawa, 18/8/2026 — 24 categorías sincronizadas bien,
    // pero el mensaje de error seguía ahí confundiendo a quien lo mirara).
    await prisma.categorySyncJob.update({
      where: { id: job.id },
      data: { status: "success", errorMessage: null, finishedAt: new Date() },
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
