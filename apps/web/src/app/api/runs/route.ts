import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { triggerWorkerNow } from "@/lib/trigger-worker";

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
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      titles: {
        orderBy: { order: "asc" },
        include: {
          events: { orderBy: { createdAt: "desc" }, take: 1 },
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
  const { titlesText, categoryId, disableIndexing } = await request.json();

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
    where: { id: categoryId, userId },
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

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { monthlyArticleLimit: true },
  });
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

  const run = await prisma.run.create({
    data: {
      userId,
      categoryId: category.id,
      status: "running",
      disableIndexing: Boolean(disableIndexing),
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
