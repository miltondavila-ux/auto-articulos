import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Edita una caja del pipeline: prompt, orden de ejecución o activa/inactiva.
// No se permite crear/borrar cajas todavía — son las 8 fijas de la
// especificación de Milton (20/8/2026); ampliar si hace falta más adelante.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as {
    systemPrompt?: string;
    executionOrder?: number;
    isActive?: boolean;
  };

  const data: { systemPrompt?: string; executionOrder?: number; isActive?: boolean } = {};
  if (typeof body.systemPrompt === "string") data.systemPrompt = body.systemPrompt;
  if (typeof body.executionOrder === "number" && Number.isFinite(body.executionOrder)) {
    data.executionOrder = body.executionOrder;
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  try {
    const box = await prisma.promptBox.update({ where: { id }, data });
    return NextResponse.json({ box });
  } catch {
    return NextResponse.json({ error: "Caja no encontrada" }, { status: 404 });
  }
}
