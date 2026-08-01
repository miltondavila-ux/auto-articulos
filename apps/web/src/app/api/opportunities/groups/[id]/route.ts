import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const result = await prisma.opportunityGroup.deleteMany({
    where: { id, userId },
  });
  if (!result.count)
    return NextResponse.json(
      { error: "Oportunidad no encontrada." },
      { status: 404 },
    );
  return NextResponse.json({ ok: true });
}
