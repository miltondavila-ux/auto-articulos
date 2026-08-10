import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function GET() {
  const userId = await getCurrentUserId();
  const integration = await prisma.twitterIntegration.findUnique({
    where: { userId },
  });

  if (!integration) {
    return NextResponse.json({ connected: false });
  }

  const isExpired = integration.expiresAt < new Date();

  return NextResponse.json({
    connected: true,
    twitterUserId: integration.twitterUserId,
    twitterUsername: integration.twitterUsername,
    expiresAt: integration.expiresAt,
    isExpired,
  });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  await prisma.twitterIntegration.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true });
}
