import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

/**
 * Log completo de un título (incluye capturas de diagnóstico en base64), a
 * diferencia de GET /api/runs que solo trae el último evento para no gastar
 * la cuota de transferencia de Neon en cada poll. Se llama bajo demanda,
 * solo cuando alguien expande "Ver todos los pasos" / "Ver log".
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const title = await prisma.title.findFirst({
    where: { id, run: { userId } },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });
  if (!title) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json({ events: title.events });
}
