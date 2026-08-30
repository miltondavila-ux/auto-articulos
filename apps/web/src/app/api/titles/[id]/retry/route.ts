import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { triggerWorkerNow } from "@/lib/trigger-worker";

/**
 * Reintento manual de un título atascado ("processing" por una caída
 * externa), con error, o cancelado por el propio usuario. Lo vuelve a
 * "pending" para que el worker lo tome de nuevo, y reabre el run si ya
 * estaba detenido/cancelado/terminado — si no, processNext() nunca lo
 * vuelve a mirar (solo busca runs "running").
 *
 * Pedido directo de Milton (30/8/2026): un título cancelado no tenía
 * ninguna forma de retomarse desde Historial — el endpoint lo rechazaba
 * igual que si fuera un estado inválido, aunque cancelar no borra nada.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const title = await prisma.title.findFirst({
    where: { id, run: { userId } },
  });
  if (!title) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (
    title.status !== "error" &&
    title.status !== "processing" &&
    title.status !== "cancelled"
  ) {
    return NextResponse.json(
      {
        error:
          "Solo se puede reintentar un título con error, atascado o cancelado.",
      },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.title.update({
      where: { id: title.id },
      data: { status: "pending", errorMessage: null },
    }),
    prisma.titleEvent.create({
      data: {
        titleId: title.id,
        message: "Reintento manual solicitado por el usuario.",
      },
    }),
    prisma.run.updateMany({
      where: { id: title.runId, status: { notIn: ["pending", "running"] } },
      data: { status: "running", finishedAt: null },
    }),
  ]);

  await triggerWorkerNow();

  return NextResponse.json({ ok: true });
}
