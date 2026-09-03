import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { triggerWorkerNow } from "@/lib/trigger-worker";
import { hasTrialAccess } from "@/lib/trial";

// Bug de consumo de datos encontrado el 30/7/2026: este endpoint se
// consulta con polling frecuente (Inicio) y en cada visita al Historial, y
// antes traía TODOS los eventos de TODOS los títulos (incluidas las
// capturas de diagnóstico en base64, de cientos de KB cada una) — eso
// agotó la cuota gratuita de transferencia de datos de Neon. Ahora solo se
// trae el último evento de cada título (suficiente para mostrar el paso
// actual); el log completo con imágenes se trae aparte, bajo demanda, solo
// cuando alguien expande "Ver todos los pasos" (ver /api/titles/[id]/events).
export async function GET() {
  const userId = await getCurrentUserId();
  const account = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true, platformDomain: true } });
  const runs = await prisma.run.findMany({
    where: {
      userId,
      category: {
        name: {
          not: "FIX_PATRICIA",
        },
        ...(account.selectedSiteDomain ? { siteDomain: account.selectedSiteDomain } : {}),
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      titles: {
        orderBy: { order: "asc" },
        include: {
          events: { orderBy: { createdAt: "desc" }, take: 1 },
          businessProfilePost: {
            select: { status: true, sentAt: true, googleResponse: true },
          },
        },
      },
      category: true,
    },
    take: 20,
  });
  return NextResponse.json({ runs });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  const account = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { selectedSiteDomain: true, platformDomain: true },
  });
  const {
    titlesText,
    categoryId,
    disableIndexing,
    contentLanguage,
    promptId,
  } = await request.json();

  if (typeof titlesText !== "string") {
    return NextResponse.json(
      { error: "titlesText es requerido" },
      { status: 400 },
    );
  }
  if (typeof categoryId !== "string" || !categoryId) {
    return NextResponse.json(
      { error: "Debes elegir una categoría" },
      { status: 400 },
    );
  }

  const titles = titlesText
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);

  if (titles.length === 0) {
    return NextResponse.json(
      { error: "No se encontraron títulos" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUniqueOrThrow({
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
    },
  });

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


  const effectiveLanguage =
    typeof contentLanguage === "string" && contentLanguage.trim()
      ? contentLanguage.trim()
      : user.contentLanguage?.trim() || "";

  if (!effectiveLanguage) {
    return NextResponse.json(
      {
        error:
          "Debes configurar tu idioma de redacción en Configuración antes de publicar.",
      },
      { status: 400 },
    );
  }

  /*
   * Cupos. Antes, pasarse de cualquier límite rechazaba el lote entero y la
   * persona se quedaba sin publicar nada. Pedido de Milton (19/8/2026): que se
   * publique lo que sí cabe y se le diga con claridad cuántos entraron,
   * cuántos quedaron fuera y cuándo volver.
   */
  const cupos: { disponible: number; tope: number; motivo: string }[] = [
    {
      disponible: user.maxTitlesPerBatch,
      tope: user.maxTitlesPerBatch,
      motivo: "tu lote máximo",
    },
  ];

  const credential = await prisma.credential.findUnique({
    where: { userId_platform: { userId, platform: "10minutesWebsite" } },
  });
  if (!credential) {
    return NextResponse.json(
      { error: `Primero debes guardar tus credenciales de ${account.platformDomain === "tagcrush" ? "tu plataforma" : "10minutesWebsite"}` },
      { status: 400 },
    );
  }

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId,
      source: { not: "archived" },
      ...(account.selectedSiteDomain ? { siteDomain: account.selectedSiteDomain } : {}),
    },
  });
  if (!category) {
    return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
  }

  const existingRunning = await prisma.run.findFirst({
    where: { userId, status: { in: ["pending", "running"] } },
  });
  if (existingRunning) {
    return NextResponse.json(
      {
        error:
          "Ya hay una ejecución en curso. Espera a que termine o se detenga.",
      },
      { status: 409 },
    );
  }

  if (user.monthlyArticleLimit !== null) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const publishedThisMonth = await prisma.title.count({
      where: {
        status: "success",
        processedAt: { gte: startOfMonth },
        run: { userId },
      },
    });
    cupos.push({
      disponible: user.monthlyArticleLimit - publishedThisMonth,
      tope: user.monthlyArticleLimit,
      motivo: "tu límite mensual",
    });
  }
  if (user.dailyArticleLimit !== null) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const publishedToday = await prisma.title.count({
      where: {
        status: "success",
        processedAt: { gte: startOfDay },
        run: { userId },
      },
    });
    cupos.push({
      disponible: user.dailyArticleLimit - publishedToday,
      tope: user.dailyArticleLimit,
      motivo: "tu límite diario",
    });
  }

  // Manda el cupo más estrecho de todos.
  const cupoMasEstrecho = cupos.reduce((a, b) => (b.disponible < a.disponible ? b : a));
  const permitidos = Math.max(0, Math.min(titles.length, cupoMasEstrecho.disponible));

  if (permitidos === 0) {
    const contextoMensual =
      user.monthlyArticleLimit !== null
        ? ` Tu límite mensual es de ${user.monthlyArticleLimit} artículos.`
        : "";
    return NextResponse.json(
      {
        error: `Has alcanzado ${cupoMasEstrecho.tope}, que es ${cupoMasEstrecho.motivo} asignado por el administrador de Auto Artículos. El cupo se renovará según ese límite.${contextoMensual}`,
      },
      { status: 403 },
    );
  }

  // Lo que no cabe se deja fuera, pero se devuelve para poder decírselo.
  const descartados = titles.slice(permitidos);
  const titulosAPublicar = titles.slice(0, permitidos);
  const avisoDeCupo =
    descartados.length > 0
      ? `Seleccionaste ${titles.length} artículos y tu cupo disponible era de ${cupoMasEstrecho.disponible}. Se enviaron a publicar ${permitidos}. Los ${descartados.length} restantes quedaron pendientes para cuando se renueve ese cupo.`
      : null;

  const run = await prisma.run.create({
    data: {
      userId,
      categoryId: category.id,
      status: "running",
      disableIndexing: Boolean(disableIndexing),
      // Idioma de ESTE lote. Se guarda solo si viene un valor real; vacío o
      // ausente deja NULL, que el worker interpreta como "usar el idioma
      // configurado del usuario" (comportamiento de siempre).
      contentLanguage:
        typeof contentLanguage === "string" && contentLanguage.trim()
          ? contentLanguage.trim()
          : null,
      promptId:
        typeof promptId === "string" && promptId.trim()
          ? promptId.trim()
          : user.defaultPromptId,
      titles: {
        create: titulosAPublicar.map((text: string, index: number) => ({
          text,
          order: index,
        })),
      },
    },
    include: { titles: true, category: true },
  });

  const worker = await triggerWorkerNow();

  // `avisoDeCupo` va con la respuesta correcta (no como error): la publicación
  // sí ocurrió, solo que recortada. La pantalla lo muestra tal cual.
  return NextResponse.json({
    run,
    avisoDeCupo,
    descartados,
    workerStarted: worker.started,
    workerAlreadyActive: worker.alreadyActive ?? false,
    workerWarning: worker.reason
      ? "La publicación quedó creada, pero el worker no pudo iniciarse de inmediato. El sistema la retomará en el próximo ciclo automático."
      : null,
  });
}

// Borra el historial del usuario (los Title/TitleEvent caen en cascada). Se
// excluyen los runs "pending"/"running": si hay uno en curso, no se toca,
// para no interrumpir al worker a mitad de una automatización.
export async function DELETE() {
  const userId = await getCurrentUserId();

  const { count } = await prisma.run.deleteMany({
    where: { userId, status: { notIn: ["pending", "running"] } },
  });

  return NextResponse.json({ deleted: count });
}
