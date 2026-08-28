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
  const runs = await prisma.run.findMany({
    where: {
      userId,
      category: {
        name: {
          not: "FIX_PATRICIA",
        },
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
  const { titlesText, categoryId, disableIndexing, contentLanguage, promptId } =
    await request.json();

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

  if (!user.hasImageCredits) {
    return NextResponse.json(
      {
        error:
          "Tu cuenta de 10minutesWebsite no tiene créditos de imagen disponibles. Solicita más créditos gratuitos en https://www.10minuteswebsite.com/ayuda",
        code: "NO_IMAGE_CREDITS",
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
          "Debes configurar tu idioma de redacción en Configuración antes de publicar.",
      },
      { status: 400 },
    );
  }

  if (titles.length > user.maxTitlesPerBatch) {
    return NextResponse.json(
      {
        error: `Puedes publicar como máximo ${user.maxTitlesPerBatch} títulos por lote (pegaste ${titles.length}). Divide la lista en varios lotes más chicos.`,
      },
      { status: 400 },
    );
  }

  const credential = await prisma.credential.findUnique({
    where: { userId_platform: { userId, platform: "10minutesWebsite" } },
  });
  if (!credential) {
    return NextResponse.json(
      { error: "Primero debes guardar tus credenciales de 10minutesWebsite" },
      { status: 400 },
    );
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId, source: { not: "archived" } },
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
    const remaining = user.monthlyArticleLimit - publishedThisMonth;
    if (titles.length > remaining) {
      return NextResponse.json(
        {
          error:
            remaining <= 0
              ? `Ya alcanzaste tu límite mensual de ${user.monthlyArticleLimit} artículos.`
              : `Solo puedes publicar ${remaining} artículo(s) más este mes (límite mensual: ${user.monthlyArticleLimit}).`,
        },
        { status: 403 },
      );
    }
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
    const remainingToday = user.dailyArticleLimit - publishedToday;
    if (titles.length > remainingToday) {
      return NextResponse.json(
        {
          error:
            remainingToday <= 0
              ? `Ya alcanzaste tu límite diario de ${user.dailyArticleLimit} artículos. Intenta de nuevo mañana.`
              : `Solo puedes publicar ${remainingToday} artículo(s) más hoy (límite diario: ${user.dailyArticleLimit}).`,
        },
        { status: 403 },
      );
    }
  }

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
        create: titles.map((text: string, index: number) => ({
          text,
          order: index,
        })),
      },
    },
    include: { titles: true, category: true },
  });

  await triggerWorkerNow();

  return NextResponse.json({ run });
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
