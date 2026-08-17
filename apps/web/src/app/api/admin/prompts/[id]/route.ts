import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { name, prompt } = await request.json();

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }
  if (typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "El prompt es obligatorio" }, { status: 400 });
  }

  const cleanName = name.trim();
  if (cleanName.toUpperCase() === "STANDARD") {
    return NextResponse.json({ error: "El nombre 'STANDARD' está reservado por el sistema" }, { status: 400 });
  }

  try {
    const updated = await prisma.prompt.update({
      where: { id },
      data: {
        name: cleanName,
        prompt: prompt.trim(),
      },
    });
    return NextResponse.json({ prompt: updated });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un estilo con ese nombre" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.prompt.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
