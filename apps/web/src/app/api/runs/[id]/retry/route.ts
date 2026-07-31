import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { triggerWorkerNow } from "@/lib/trigger-worker";

/**
 * Reintenta de una vez TODOS los títulos con error de un run terminado
 * ("halted"): los vuelve a "pending" y reabre el run a "running" para que
 * el worker los retome. Complementa el reintento individual por título
 * (POST /api/titles/[id]/retry) para cuando hay varios títulos con error
 * en el mismo lote.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const run = await prisma.run.findFirst({ where: { id, userId } });
  if (!run) {
    return NextResponse.json(
      { error: "Ejecución no encontrada" },
      { status: 404 },
    );
  }

  const errorTitles = await prisma.title.findMany({
    where: { runId: run.id, status: "error" },
    select: { id: true },
  });
  if (errorTitles.length === 0) {
    return NextResponse.json(
      { error: "Esta ejecución no tiene títulos con error." },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.title.updateMany({
      where: { id: { in: errorTitles.map((t) => t.id) } },
      data: { status: "pending", errorMessage: null },
    }),
    prisma.titleEvent.createMany({
      data: errorTitles.map((t) => ({
        titleId: t.id,
        message: "Reintento manual solicitado por el usuario.",
      })),
    }),
    prisma.run.update({
      where: { id: run.id },
      data: { status: "running", finishedAt: null },
    }),
  ]);

  await triggerWorkerNow();

  return NextResponse.json({ ok: true, retried: errorTitles.length });
}
