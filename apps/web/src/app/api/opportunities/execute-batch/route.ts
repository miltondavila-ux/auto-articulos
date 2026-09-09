import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { platformProductNameOrNeutral } from "@auto-articulos/shared";
import { triggerWorkerNow } from "@/lib/trigger-worker";
import { hasTrialAccess } from "@/lib/trial";

// Publica una selección de títulos de diferentes categorías de Oportunidades.
// El usuario selecciona títulos individuales mediante checkboxes, independientemente
// de su categoría. Esta función agrupa esos títulos por categoría y crea un Run
// para cada grupo, igual que execute-all pero solo con los títulos seleccionados.
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  const {
    titleIds,
    disableIndexing,
    contentLanguage,
    promptId,
  } = (await request.json().catch(() => ({}))) as {
    titleIds?: string[];
    disableIndexing?: boolean;
    contentLanguage?: string;
    promptId?: string;
    confirmedImageCredits?: boolean;
  };

  if (
    !Array.isArray(titleIds) ||
    titleIds.length === 0
  ) {
    return NextResponse.json(
      { error: "Debes seleccionar al menos un título para publicar." },
      { status: 400 },
    );
  }

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
      {
        error: `Primero guarda tus credenciales de ${platformProductNameOrNeutral(
          user.platformDomain,
        )}.`,
      },
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
      {
        error: "Ya tienes una ejecución en curso. Espera a que termine.",
      },
      { status: 409 },
    );
  }

  // Verificar que todos los títulos pertenecen al usuario y obtenerlos agrupados por categoría
  const selectedTitles = await prisma.opportunityTitle.findMany({
    where: {
      id: { in: titleIds },
      group: { userId },
    },
    include: {
      group: {
        include: { category: true },
      },
    },
  });

  if (selectedTitles.length === 0) {
    return NextResponse.json(
      { error: "No se encontraron títulos para publicar." },
      { status: 400 },
    );
  }

  if (selectedTitles.length > user.maxTitlesPerBatch) {
    return NextResponse.json(
      {
        error: `La selección supera tu cupo de ${user.maxTitlesPerBatch} títulos por lote. Deselecciona algunos títulos.`,
      },
      { status: 400 },
    );
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  );

  const [publishedToday, publishedThisMonth] = await Promise.all([
    prisma.title.count({
      where: {
        run: { userId },
        status: "success",
        processedAt: { gte: startOfDay },
      },
    }),
    prisma.title.count({
      where: {
        run: { userId },
        status: "success",
        processedAt: { gte: startOfMonth },
      },
    }),
  ]);

  const availableDaily =
    user.dailyArticleLimit === null
      ? Infinity
      : Math.max(0, user.dailyArticleLimit - publishedToday);
  const availableMonthly =
    user.monthlyArticleLimit === null
      ? Infinity
      : Math.max(0, user.monthlyArticleLimit - publishedThisMonth);
  const available = Math.min(
    user.maxTitlesPerBatch,
    availableDaily,
    availableMonthly,
  );

  if (available < selectedTitles.length) {
    const renewal =
      availableDaily === 0
        ? "Tu límite diario se renovará mañana."
        : availableMonthly === 0
          ? "Tu límite mensual se renovará al comenzar el próximo mes."
          : "Puedes intentarlo en otro momento cuando tengas cupo disponible.";
    return NextResponse.json(
      {
        error: `Tu cupo disponible es de ${available} artículos. Seleccionaste ${selectedTitles.length}. ${renewal}`,
      },
      { status: 400 },
    );
  }

  // Agrupar títulos por categoría
  const titlesByCategory = new Map<
    string,
    (typeof selectedTitles)[number][]
  >();
  for (const title of selectedTitles) {
    if (!titlesByCategory.has(title.group.categoryId)) {
      titlesByCategory.set(title.group.categoryId, []);
    }
    titlesByCategory.get(title.group.categoryId)!.push(title);
  }

  const normalizedContentLanguage =
    typeof contentLanguage === "string" && contentLanguage.trim()
      ? contentLanguage.trim()
      : null;

  const runIds = await prisma.$transaction(async (tx) => {
    const ids: string[] = [];

    for (const [categoryId, titles] of titlesByCategory) {
      const group = selectedTitles.find((t) => t.group.categoryId === categoryId)?.group;
      if (!group) continue;

      const created = await tx.run.create({
        data: {
          userId,
          categoryId,
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

      // Eliminar los títulos seleccionados del grupo de oportunidades
      await tx.opportunityTitle.deleteMany({
        where: { id: { in: titles.map((t) => t.id) } },
      });

      // Si el grupo queda sin títulos, eliminarlo
      const remainingTitles = await tx.opportunityTitle.count({
        where: { groupId: group.id },
      });

      if (remainingTitles === 0) {
        await tx.opportunityGroup.delete({ where: { id: group.id } });
      }
    }

    return ids;
  });

  const worker = await triggerWorkerNow();
  return NextResponse.json({
    ok: true,
    runIds,
    publishedCount: selectedTitles.length,
    pendingCount: 0,
    workerStarted: worker.started,
    workerAlreadyActive: worker.alreadyActive ?? false,
    workerWarning: worker.reason
      ? "Las publicaciones quedaron creadas, pero el worker no pudo iniciarse de inmediato. El sistema las retomará en el próximo ciclo automático."
      : null,
  });
}
