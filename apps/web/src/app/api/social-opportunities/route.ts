import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { canUseSocialModule } from "@/lib/social-access";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!(await canUseSocialModule(userId))) return NextResponse.json({ error: "Módulo reservado a administradores y Lorena." }, { status: 403 });
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
    if (!(await canUseSocialModule(userId))) return NextResponse.json({ error: "Módulo reservado a administradores y Lorena." }, { status: 403 });
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
    if (!(await canUseSocialModule(userId))) return NextResponse.json({ error: "Módulo reservado a administradores y Lorena." }, { status: 403 });

    // El historial es la protección contra propuestas repetidas. No se borra
    // automáticamente: una publicación terminada debe seguir impidiendo que
    // el mismo artículo vuelva a proponerse para la misma red por accidente.
    return NextResponse.json({
      success: true,
      deleted: 0,
      message: "El historial de oportunidades se conserva para evitar publicaciones repetidas.",
    });
  } catch {
    return NextResponse.json({ error: "Error al eliminar propuestas" }, { status: 500 });
  }
}
