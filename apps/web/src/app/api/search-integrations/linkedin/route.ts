import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function GET() {
  const userId = await getCurrentUserId();
  const integration = await prisma.linkedInIntegration.findUnique({
    where: { userId },
  });

  if (!integration) {
    return NextResponse.json({ connected: false });
  }

  const isExpired = integration.expiresAt < new Date();

  return NextResponse.json({
    connected: true,
    linkedinUserId: integration.linkedinUserId,
    linkedinUsername: integration.linkedinUsername,
    expiresAt: integration.expiresAt,
    isExpired,
  });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  await prisma.linkedInIntegration.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true });
}
