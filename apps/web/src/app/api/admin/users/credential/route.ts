import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { auditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/current-user";

const PLATFORM = "10minutesWebsite";

export async function DELETE(request: NextRequest) {
  let adminId: string;
  try {
    adminId = (await requireAdmin()).id;
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { userId } = await request.json();
  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId es requerido" }, { status: 400 });
  }

  await prisma.credential.deleteMany({ where: { userId, platform: PLATFORM } });
  auditLog("credential_deleted", adminId, { targetUserId: userId, platform: PLATFORM });

  return NextResponse.json({ ok: true });
}
