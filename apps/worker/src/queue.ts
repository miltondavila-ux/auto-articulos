import { prisma, Prisma } from "@auto-articulos/db";
import { decryptSecret, MAX_ATTEMPTS } from "@auto-articulos/shared";
import {
  publishArticle,
  DailyLimitReachedError,
} from "./automation/10minutesWebsite";
import {
  tryReserveUser,
  releaseUser,
  renewUserReservation,
} from "./reservation";
import { notifyGoogle } from "./googleIndexing";
import { notifyBing } from "./bingIndexing";
import { runPatriciaFix } from "./fix-patricia";


async function markTitleError(titleId: string, message: string) {
  await prisma.title.update({
    where: { id: titleId },
    data: { status: "error", errorMessage: message, processedAt: new Date() },
  });
}

const OPPORTUNITY_RETRY_NOTE =
  "No se publicó en el primer intento y quedó disponible en Oportunidades para reintentarlo.";

/**
 * Reincorpora al módulo Oportunidades los títulos que ya no pueden avanzar en
 * este Run. Al iniciar una publicación el grupo original se convierte en Run
 * y se elimina; sin esta compensación, un fallo definitivo hacía desaparecer
 * la oportunidad aunque el artículo nunca hubiera sido publicado.
 */
async function restoreUnfinishedTitlesToOpportunities(
  runId: string,
  onlyTitleId?: string,
) {
  await prisma.$transaction(async (tx) => {
    const run = await tx.run.findUnique({
      where: { id: runId },
      select: { userId: true, categoryId: true },
    });
    if (!run) return;

    const titles = await tx.title.findMany({
      where: {
        runId,
        ...(onlyTitleId ? { id: onlyTitleId } : {}),
        status: { in: ["pending", "error"] },
      },
      orderBy: { order: "asc" },
      select: { text: true },
    });
    if (titles.length === 0) return;

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

    for (const title of titles) {
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
          data: {
            groupId: group.id,
            text: title.text,
            rationale: OPPORTUNITY_RETRY_NOTE,
          },
        });
      }
    }
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
export async function processNext(filterUserId?: string): Promise<boolean> {
  const candidates = await prisma.run.findMany({
    where: { status: "running", ...(filterUserId ? { userId: filterUserId } : {}) },
    orderBy: { createdAt: "asc" },
    include: {
      category: true,
      prompt: true,
      user: {
        select: {
          platformDomain: true,
          contentLanguage: true,
          articleSignature: true,
          phone: true,
          country: true,
          name: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    // Hay ~60 usuarios objetivo y hasta 40 lanes concurrentes. Limitar la
    // búsqueda a 20 hacía que todos compitieran por el mismo subconjunto y no
    // vieran trabajo válido más abajo en la cola.
    take: 100,
  });

  type RunWithCategory = (typeof candidates)[number];
  let run: RunWithCategory | null = null;
  for (const candidate of candidates) {
    if (await tryReserveUser(candidate.userId)) {
      run = candidate;
      break;
    }
  }
  if (!run) return false;

  // Una publicación real puede superar el TTL original de cinco minutos.
  // Renovar el lease evita que otro shard abra una segunda sesión en la misma
  // cuenta mientras este worker todavía está generando o guardando el artículo.
  const reservationHeartbeat = setInterval(() => {
    void renewUserReservation(run!.userId).catch((err) => {
      console.error("No se pudo renovar la reserva del usuario:", err);
    });
  }, 60_000);

  try {
    return await processRunTitle(run);
  } finally {
    clearInterval(reservationHeartbeat);
    await releaseUser(run.userId);
  }
}

async function processRunTitle(
  run: Prisma.RunGetPayload<{
    include: {
      category: true;
      prompt: true;
      user: {
        select: {
          platformDomain: true;
          contentLanguage: true;
          articleSignature: true;
          phone: true;
          country: true;
          name: true;
          firstName: true;
          lastName: true;
        };
      };
    };
  }>,
): Promise<boolean> {
  const nextTitle = await prisma.title.findFirst({
    where: { runId: run.id, status: "pending" },
    orderBy: { order: "asc" },
  });

  if (!nextTitle) {
    // Si todavía hay títulos procesándose en otros lanes, no finalizamos el run
    const processingCount = await prisma.title.count({
      where: { runId: run.id, status: "processing" },
    });
    if (processingCount > 0) {
      return false;
    }

    // Ya no quedan títulos pendientes ni en proceso: el lote terminó. Si alguno quedó en
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
    await restoreUnfinishedTitlesToOpportunities(run.id);
    return true;
  }

  // Reclamo atómico: varios lanes pueden haber leído el mismo título
  // pendiente antes de llegar aquí. Solo el primero que todavía lo encuentre
  // en pending puede cambiarlo a processing y aumentar los intentos.
  const claimed = await prisma.title.updateMany({
    where: { id: nextTitle.id, status: "pending" },
    data: { status: "processing", attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return false;

  const updated = await prisma.title.findUniqueOrThrow({
    where: { id: nextTitle.id },
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

    if (run.category.name === "FIX_PATRICIA") {
      await onStep("Iniciando reparación de artículos de Patricia Coy...");
      const result = await runPatriciaFix(username, password, run.user.platformDomain || "net", onStep);
      await prisma.title.update({
        where: { id: nextTitle.id },
        data: {
          status: "success",
          processedAt: new Date(),
          errorMessage: null,
          finalTitle: result.failed > 0
            ? `Lote completado con ${result.failed} pendiente(s)`
            : "Lote completado sin errores",
        },
      });
      await onStep(result.failed > 0
        ? `Lote completado; ${result.failed} artículo(s) quedan pendientes para reintentar.`
        : "Lote de reparación completado sin errores.");

      // Si se procesó un lote completo y aún quedan más páginas/artículos:
      const totalProcessed = result.repaired + result.alreadyCorrect;
      if (totalProcessed >= 20 && result.hasNextPage) {
        await onStep("Automatización: Lote finalizado. Creando el siguiente lote de forma automática...");
        
        const nextRun = await prisma.run.create({
          data: {
            userId: run.userId,
            categoryId: run.categoryId,
            status: "running",
            contentLanguage: "es",
          },
        });
        const nextTitleRec = await prisma.title.create({
          data: {
            runId: nextRun.id,
            text: "Reparar el siguiente lote de hasta 20 artículos de Patricia Coy",
            status: "pending",
            order: 0,
          },
        });
        await prisma.titleEvent.create({
          data: {
            titleId: nextTitleRec.id,
            message: "Lote solicitado automáticamente por la secuencia recursiva. El worker procesará hasta 20 artículos...",
          },
        });
      }
      return true;
    }

    const effectiveLanguage =
      (run.contentLanguage && run.contentLanguage.trim()) ||
      (run.user.contentLanguage && run.user.contentLanguage.trim());

    if (!effectiveLanguage) {
      await markTitleError(
        nextTitle.id,
        "No se encontró un idioma de redacción configurado para este lote ni en el perfil del usuario. Configúralo en Configuración antes de reintentar.",
      );
      await prisma.run.updateMany({
        where: { id: run.id, status: { in: ["pending", "running"] } },
        data: { status: "halted", finishedAt: new Date() },
      });
      await restoreUnfinishedTitlesToOpportunities(run.id);
      return true;
    }

    const result = await publishArticle(
      {
        username,
        password,
        platformDomain: run.user.platformDomain,
        // El idioma elegido para ESTE lote manda; si el lote no trae ninguno
        // (corridas anteriores al campo, o el usuario no lo cambió), se usa el
        // configurado del usuario, que es el comportamiento de siempre.
        contentLanguage: effectiveLanguage,
        articleSignature: run.user.articleSignature,
        userPhone: run.user.phone,
        userCountry: run.user.country,
        authorName:
          [run.user.firstName, run.user.lastName].filter(Boolean).join(" ") ||
          run.user.name ||
          null,
        promptText: run.prompt?.prompt || null,
      },
      nextTitle.text,
      run.category.externalId,
      run.disableIndexing,
      onStep,
      run.category.panel,
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
        summary: result.summary,
        publishedAt: new Date(),
        processedAt: new Date(),
        errorMessage: null,
      },
    });
    await onStep("Artículo publicado con éxito.");
    await notifyGoogle(nextTitle.id, run.userId);
    await notifyBing(nextTitle.id, run.userId);
    // await notifyThreads(nextTitle.id, run.userId); // Desactivado por solicitud: las publicaciones a redes ahora se controlan desde el módulo de Oportunidades Redes.
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // El cuerpo real de la respuesta del servidor (capturado en
    // generateImage()) llega tal cual lo mandó PHP, con las tildes escapadas
    // como "é" en vez del carácter real — un response.text() nunca las
    // decodifica. Bug confirmado el 21/8/2026: el mensaje real del sitio
    // ("Se han agotado los créditos de tu imagen...") no matcheaba NUNCA
    // el string con tilde literal de abajo, así que el popup de "sin
    // créditos" nunca se disparaba para el caso real (solo para la
    // suposición del fallback sin datos de red). Se normaliza antes de
    // buscar la señal.
    const normalizedMessage = message.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
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
    } else if (run.category.name === "FIX_PATRICIA") {
      // Un lote administrativo nunca se reintenta automáticamente: cada orden
      // puede modificar como máximo 20 artículos. El siguiente lote requiere
      // una nueva orden y retomará los pendientes de forma idempotente.
    } else if (
      // Solo una respuesta explícita de falta de saldo debe cambiar el estado
      // global de la cuenta. Un 500 con texto "Insufficient credits" puede ser
      // un fallo del endpoint o de la sesión; no hay saldo numérico verificable
      // en nuestro modelo para convertirlo en un bloqueo permanente.
      /(?:→|status\s*)\s*402\b/i.test(normalizedMessage) ||
      /(?:no tiene|agotad[oa]s?|sin) (?:los )?(?:tokens|cr[ée]ditos)/i.test(normalizedMessage)
    ) {
      await prisma.user.update({
        where: { id: run.userId },
        data: { hasImageCredits: false },
      });
      await markTitleError(nextTitle.id, message);
      await prisma.run.updateMany({
        where: { id: run.id, status: { in: ["pending", "running"] } },
        data: { status: "halted", finishedAt: new Date() },
      });
      await restoreUnfinishedTitlesToOpportunities(run.id);
    } else if (err instanceof DailyLimitReachedError) {
      // Límite diario de artículos confirmado por el propio sitio (no una
      // hipótesis): NINGÚN otro título de este lote puede avanzar hoy, así
      // que se detiene todo de una vez en vez de reintentar título por
      // título contra el mismo límite (desperdiciando turnos del worker que
      // podrían usar otros usuarios) — mismo tratamiento que credenciales
      // faltantes.
      await markTitleError(nextTitle.id, message);
      await prisma.run.updateMany({
        where: { id: run.id, status: { in: ["pending", "running"] } },
        data: { status: "halted", finishedAt: new Date() },
      });
      await restoreUnfinishedTitlesToOpportunities(run.id);
    } else if (fresh.attempts >= MAX_ATTEMPTS) {
      // Se acabaron los intentos para ESTE título, pero el lote sigue: el
      // worker continúa con los demás títulos pendientes del mismo run.
      await markTitleError(nextTitle.id, message);
      await restoreUnfinishedTitlesToOpportunities(run.id, nextTitle.id);
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
