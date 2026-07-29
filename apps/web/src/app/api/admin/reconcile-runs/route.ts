import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";

// Endpoint temporal: corrige el status de nivel-Run para que coincida con
// el resultado real de sus títulos (usado tras reconciliar títulos a mano).
// Se elimina después de usarse.
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { runIds } = (await request.json()) as { runIds: string[] };
  if (!Array.isArray(runIds)) {
    return NextResponse.json({ error: "runIds debe ser un arreglo" }, { status: 400 });
  }

  const results = [];
  for (const runId of runIds) {
    const updated = await prisma.run.update({
      where: { id: runId },
      data: { status: "halted" },
    });
    results.push({ id: updated.id, status: updated.status });
  }

  return NextResponse.json({ results });
}
