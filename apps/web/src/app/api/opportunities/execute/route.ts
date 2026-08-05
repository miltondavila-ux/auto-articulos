import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { triggerWorkerNow } from "@/lib/trigger-worker";

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  const { type, id, disableIndexing } = (await request.json()) as {
    type?: string;
    id?: string;
    disableIndexing?: boolean;
  };
  if ((type !== "group" && type !== "title") || !id) {
    return NextResponse.json({ error: "Selección inválida." }, { status: 400 });
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
      select: { maxTitlesPerBatch: true },
    }),
  ]);
  if (!credential) {
    return NextResponse.json(
      { error: "Primero guarda tus credenciales de 10minutesWebsite." },
      { status: 400 },
    );
  }
  if (activeRun) {
    return NextResponse.json(
      { error: "Ya tienes una ejecución en curso. Espera a que termine." },
      { status: 409 },
    );
  }

  const group = await prisma.opportunityGroup.findFirst({
    where:
      type === "group" ? { id, userId } : { userId, titles: { some: { id } } },
    include: { titles: { orderBy: { createdAt: "asc" } }, category: true },
  });
  if (!group) {
    console.error("opportunities/execute: not found", { userId, type, id });
    return NextResponse.json(
      { error: "Oportunidad no encontrada." },
      { status: 404 },
    );
  }
  const selected =
    type === "group"
      ? group.titles
      : group.titles.filter((title) => title.id === id);
  if (selected.length === 0) {
    return NextResponse.json(
      { error: "No hay títulos para ejecutar." },
      { status: 400 },
    );
  }
  if (selected.length > user.maxTitlesPerBatch) {
    return NextResponse.json(
      {
        error: `Puedes ejecutar como máximo ${user.maxTitlesPerBatch} títulos por lote (esta categoría tiene ${selected.length}). Elimina algunos títulos o pide al administrador que aumente tu máximo.`,
      },
      { status: 400 },
    );
  }

  const run = await prisma.$transaction(async (tx) => {
    const created = await tx.run.create({
      data: {
        userId,
        categoryId: group.categoryId,
        status: "running",
        disableIndexing: Boolean(disableIndexing),
        titles: {
          create: selected.map((title, order) => ({ text: title.text, order })),
        },
      },
      select: { id: true },
    });
    if (type === "group") {
      await tx.opportunityGroup.delete({ where: { id: group.id } });
    } else {
      await tx.opportunityTitle.delete({ where: { id } });
      const remaining = await tx.opportunityTitle.count({
        where: { groupId: group.id },
      });
      if (remaining === 0)
        await tx.opportunityGroup.delete({ where: { id: group.id } });
    }
    return created;
  });
  await triggerWorkerNow();
  return NextResponse.json({ ok: true, runId: run.id });
}
