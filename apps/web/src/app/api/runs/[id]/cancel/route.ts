import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

/**
 * Cancela una ejecución en curso. El título que ya esté "processing" en ese
 * momento no se puede interrumpir a mitad de camino (sigue corriendo en el
 * runner de GitHub Actions hasta que termine), pero los títulos "pending" se
 * marcan como cancelados de una vez y el worker no toma más trabajo de esta
 * ejecución (queue.ts solo busca runs con status "running").
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
  if (run.status !== "pending" && run.status !== "running") {
    return NextResponse.json(
      { error: "Esta ejecución ya terminó, no se puede cancelar." },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.run.updateMany({
      where: { id: run.id, status: { in: ["pending", "running"] } },
      data: { status: "cancelled", finishedAt: new Date() },
    }),
    prisma.title.updateMany({
      where: { runId: run.id, status: "pending" },
      data: { status: "cancelled" },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
