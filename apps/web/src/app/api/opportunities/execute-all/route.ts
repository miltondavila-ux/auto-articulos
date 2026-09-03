import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { platformProductNameOrNeutral } from "@auto-articulos/shared";
import { triggerWorkerNow } from "@/lib/trigger-worker";
import { hasTrialAccess } from "@/lib/trial";

// Publica TODAS las categorías de Oportunidades de una sola vez — pedido
// explícito del usuario (8/8/2026). Cada categoría se convierte en un Run
// propio (Run.categoryId es una sola categoría por diseño, ver schema.prisma),
// igual que ya hace POST /api/opportunities/execute con type:"group" para UNA
// categoría; esto simplemente repite ese mismo patrón para todas a la vez, en
// una sola transacción.
//
// Regla explícita del usuario: si la SUMA de títulos de todas las categorías
// supera el máximo por lote del usuario (User.maxTitlesPerBatch, 20 por
// defecto), se rechaza TODO — no se publica ninguna categoría parcialmente.
// El usuario prefiere que se le diga "no puedo" a que se publique una parte y
// se le pierda de vista el resto.
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  const { disableIndexing, contentLanguage, promptId } = (await request
    .json()
    .catch(() => ({}))) as {
    disableIndexing?: boolean;
    contentLanguage?: string;
    promptId?: string;
    confirmedImageCredits?: boolean;
  };

  const [credential, activeRun, user] = await Promise.all([
    prisma.credential.findUnique({
      where: { userId_platform: { userId, platform: "10minutesWebsite" } },
      select: { id: true },
    }),
    prisma.run.findFirst({
      where: { userId, status: { in: ["pending", "running"] } },
      select: { id: true },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        role: true,
        isTrialSignup: true,
        trialStartedAt: true,
        trialUnlocked: true,
        maxTitlesPerBatch: true,
        monthlyArticleLimit: true,
        dailyArticleLimit: true,
        contentLanguage: true,
        hasImageCredits: true,
        defaultPromptId: true,
        platformDomain: true,
      },
    }),
  ]);
  if (!hasTrialAccess(user)) {
    return NextResponse.json(
      {
        error:
          "Tu período de prueba gratuita ha finalizado. Contacta al administrador para desbloquear tu cuenta.",
        code: "TRIAL_EXPIRED",
      },
      { status: 403 },
    );
  }
  if (!credential) {
    return NextResponse.json(
      { error: `Primero guarda tus credenciales de ${platformProductNameOrNeutral(user.platformDomain)}.` },
      { status: 400 },
    );
  }
  const effectiveLanguage =
    typeof contentLanguage === "string" && contentLanguage.trim()
      ? contentLanguage.trim()
      : user.contentLanguage?.trim() || "";
  if (!effectiveLanguage) {
    return NextResponse.json(
      {
        error:
          "Debes configurar tu idioma de redacción en Configuración antes de ejecutar oportunidades.",
      },
      { status: 400 },
    );
  }
  if (activeRun) {
    return NextResponse.json(
      { error: "Ya tienes una ejecución en curso. Espera a que termine." },
      { status: 409 },
    );
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [publishedToday, publishedThisMonth] = await Promise.all([
    prisma.title.count({ where: { run: { userId }, status: "success", processedAt: { gte: startOfDay } } }),
    prisma.title.count({ where: { run: { userId }, status: "success", processedAt: { gte: startOfMonth } } }),
  ]);
  const availableDaily = user.dailyArticleLimit === null ? Infinity : Math.max(0, user.dailyArticleLimit - publishedToday);
  const availableMonthly = user.monthlyArticleLimit === null ? Infinity : Math.max(0, user.monthlyArticleLimit - publishedThisMonth);
  const available = Math.min(user.maxTitlesPerBatch, availableDaily, availableMonthly);

  let groups = await prisma.opportunityGroup.findMany({
    where: { userId },
    include: { titles: { orderBy: { createdAt: "asc" } } },
  });
  if (groups.length === 0) {
    return NextResponse.json(
      { error: "No hay oportunidades guardadas para publicar." },
      { status: 400 },
    );
  }


  /*
   * Cupo. Antes, pasarse del máximo por lote rechazaba TODO y la persona se
   * quedaba sin publicar nada. Pedido de Milton (19/8/2026): publicar lo que
   * cabe y avisar. Las categorías grandes se dividen en bloques; el resto se
   * conserva como oportunidad para no perder ningún título ni su contexto.
   */
  const gruposQueCaben: Array<{
    group: (typeof groups)[number];
    titles: (typeof groups)[number]["titles"];
  }> = [];
  let acumulado = 0;
  let pendingCount = 0;
  for (const grupo of groups) {
    const capacidad = Math.max(0, available - acumulado);
    const titles = grupo.titles.slice(0, capacidad);
    if (titles.length > 0) {
      gruposQueCaben.push({ group: grupo, titles });
      acumulado += titles.length;
    }
    pendingCount += grupo.titles.length - titles.length;
  }

  if (gruposQueCaben.length === 0) {
    const renewal = availableDaily === 0
      ? "Tu límite diario se renovará mañana."
      : availableMonthly === 0
        ? "Tu límite mensual se renovará al comenzar el próximo mes."
        : "Puedes intentarlo en otro lote cuando tengas cupo disponible.";
    return NextResponse.json(
      { error: `Tu cupo disponible es de 0 artículos. Los títulos quedaron pendientes. ${renewal}` },
      { status: 400 },
    );
  }

  const avisoDeCupo =
    pendingCount > 0
      ? `Se enviaron a publicar ${acumulado} títulos porque tu cupo disponible actual es de ${available} artículos. Los ${pendingCount} restantes quedaron pendientes en Oportunidades.`
      : null;

  const normalizedContentLanguage =
    typeof contentLanguage === "string" && contentLanguage.trim()
      ? contentLanguage.trim()
      : null;

  const runIds = await prisma.$transaction(async (tx) => {
    const ids: string[] = [];
    for (const { group, titles } of gruposQueCaben) {
      const created = await tx.run.create({
        data: {
          userId,
          categoryId: group.categoryId,
          status: "running",
          disableIndexing: Boolean(disableIndexing),
          contentLanguage: normalizedContentLanguage,
          promptId:
            typeof promptId === "string" && promptId.trim()
              ? promptId.trim()
              : user.defaultPromptId,
          titles: {
            create: titles.map((title, order) => ({
              text: title.text,
              order,
              opportunityCreatedAt: group.createdAt,
            })),
          },
        },
        select: { id: true },
      });
      ids.push(created.id);
      // Cascade en el schema borra las OpportunityTitle de este grupo junto
      // con el grupo.
      await tx.opportunityGroup.delete({ where: { id: group.id } });

      const remainingTitles = group.titles.slice(titles.length);
      if (remainingTitles.length > 0) {
        await tx.opportunityGroup.create({
          data: {
            userId: group.userId,
            categoryId: group.categoryId,
            rationale: group.rationale,
            impressions: group.impressions,
            clicks: group.clicks,
            titles: {
              create: remainingTitles.map((title) => ({
                text: title.text,
                rationale: title.rationale,
              })),
            },
          },
        });
      }
    }
    return ids;
  });

  const worker = await triggerWorkerNow();
  return NextResponse.json({
    ok: true,
    runIds,
    avisoDeCupo,
    publishedCount: acumulado,
    pendingCount,
    workerStarted: worker.started,
    workerAlreadyActive: worker.alreadyActive ?? false,
    workerWarning: worker.reason
      ? "Las publicaciones quedaron creadas, pero el worker no pudo iniciarse de inmediato. El sistema las retomará en el próximo ciclo automático."
      : null,
  });
}
