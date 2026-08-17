import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { canUseSocialModule } from "@/lib/social-access";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!(await canUseSocialModule(userId))) return NextResponse.json({ connected: false });
  const integration = await prisma.facebookPageIntegration.findUnique({ where: { userId } });
  if (!integration) return NextResponse.json({ connected: false });

  return NextResponse.json({
    connected: true,
    facebookPageId: integration.facebookPageId,
    facebookPageName: integration.facebookPageName,
    expiresAt: integration.expiresAt,
    isExpired: integration.expiresAt < new Date(),
  });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!(await canUseSocialModule(userId))) return NextResponse.json({ error: "Módulo reservado a administradores y Lorena." }, { status: 403 });
  await prisma.facebookPageIntegration.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true });
}
