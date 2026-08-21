import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Sistema de prompts encadenados para el generador de imágenes (20/8/2026,
// pedido de Milton) — lista las cajas en orden de ejecución, cada una con
// su última corrida (para el bloque "Ver última ejecución" del admin).
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const boxes = await prisma.promptBox.findMany({
    orderBy: { executionOrder: "asc" },
    include: {
      executions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({ boxes });
}
