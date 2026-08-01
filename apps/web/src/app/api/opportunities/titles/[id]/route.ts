import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const title = await prisma.opportunityTitle.findFirst({
    where: { id, group: { userId } },
    select: { id: true, groupId: true },
  });
  if (!title)
    return NextResponse.json(
      { error: "Título no encontrado." },
      { status: 404 },
    );
  await prisma.$transaction(async (tx) => {
    await tx.opportunityTitle.delete({ where: { id: title.id } });
    const remaining = await tx.opportunityTitle.count({
      where: { groupId: title.groupId },
    });
    if (remaining === 0)
      await tx.opportunityGroup.delete({ where: { id: title.groupId } });
  });
  return NextResponse.json({ ok: true });
}
