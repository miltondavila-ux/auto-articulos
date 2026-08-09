import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const opportunities = await prisma.socialOpportunity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ opportunities });
  } catch {
    return NextResponse.json({ error: "Error al obtener propuestas" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id es requerido" },
        { status: 400 }
      );
    }

    const opp = await prisma.socialOpportunity.findFirst({
      where: { id, userId },
    });

    if (!opp) {
      return NextResponse.json(
        { error: "Propuesta no encontrada" },
        { status: 404 }
      );
    }

    // Si es un descarte (skip)
    if (body.skip && body.skipReason) {
      const updated = await prisma.socialOpportunity.update({
        where: { id },
        data: {
          status: "skipped",
          skipReason: body.skipReason,
          errorLog: null,
        },
      });
      return NextResponse.json({ opportunity: updated });
    }

    // Si es solo actualización de texto
    if (typeof body.suggestedText === "string") {
      const updated = await prisma.socialOpportunity.update({
        where: { id },
        data: { suggestedText: body.suggestedText },
      });
      return NextResponse.json({ opportunity: updated });
    }

    return NextResponse.json(
      { error: "Envío inválido: falta suggestedText o skip+skipReason" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ error: "Error al actualizar propuesta" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const userId = await getCurrentUserId();

    // Borrar todas las propuestas que no estén pendientes (es decir, publicadas o con error)
    await prisma.socialOpportunity.deleteMany({
      where: {
        userId,
        status: { not: "pending" },
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar propuestas" }, { status: 500 });
  }
}
