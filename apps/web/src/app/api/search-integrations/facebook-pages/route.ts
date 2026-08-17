import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUser, getCurrentUserId } from "@/lib/current-user";

export async function GET() {
  const userId = await getCurrentUserId();
  const user = await getCurrentUser();
  if (user.role !== "admin") return NextResponse.json({ connected: false });
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
  const user = await getCurrentUser();
  if (user.role !== "admin") return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  await prisma.facebookPageIntegration.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true });
}
