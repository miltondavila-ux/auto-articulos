import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { triggerWorkerNow } from "@/lib/trigger-worker";

export async function GET() {
  const userId = await getCurrentUserId();
  const runs = await prisma.run.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      titles: {
        orderBy: { order: "asc" },
        include: { events: { orderBy: { createdAt: "asc" } } },
      },
      category: true,
    },
    take: 20,
  });
  return NextResponse.json({ runs });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  const { titlesText, categoryId } = await request.json();

  if (typeof titlesText !== "string") {
    return NextResponse.json({ error: "titlesText es requerido" }, { status: 400 });
  }
  if (typeof categoryId !== "string" || !categoryId) {
    return NextResponse.json({ error: "Debes elegir una categoría" }, { status: 400 });
  }

  const titles = titlesText
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);

  if (titles.length === 0) {
    return NextResponse.json({ error: "No se encontraron títulos" }, { status: 400 });
  }

  const credential = await prisma.credential.findUnique({
    where: { userId_platform: { userId, platform: "10minutesWebsite" } },
  });
  if (!credential) {
    return NextResponse.json(
      { error: "Primero debes guardar tus credenciales de 10minutesWebsite" },
      { status: 400 }
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
      { error: "Ya hay una ejecución en curso. Espera a que termine o se detenga." },
      { status: 409 }
    );
  }

  const run = await prisma.run.create({
    data: {
      userId,
      categoryId: category.id,
      status: "running",
      titles: {
        create: titles.map((text: string, index: number) => ({ text, order: index })),
      },
    },
    include: { titles: true, category: true },
  });

  await triggerWorkerNow();

  return NextResponse.json({ run });
}
