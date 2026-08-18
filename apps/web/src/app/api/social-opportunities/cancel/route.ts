import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { canUseSocialModule } from "@/lib/social-access";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!(await canUseSocialModule(userId))) {
      return NextResponse.json({ error: "Módulo reservado a administradores y Lorena." }, { status: 403 });
    }
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "id es requerido" }, { status: 400 });

    const result = await prisma.socialOpportunity.updateMany({
      where: { id, userId, status: { in: ["pending", "queued", "processing"] } },
      data: {
        status: "skipped",
        skipReason: "Cancelado por el usuario",
        progressStage: "Publicación cancelada por el usuario",
        finishedAt: new Date(),
        errorLog: null,
      },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "La publicación ya terminó o no existe." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "No se pudo cancelar la publicación." }, { status: 500 });
  }
}
