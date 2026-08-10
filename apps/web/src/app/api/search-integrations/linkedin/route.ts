import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();
  const integration = await prisma.linkedInIntegration.findUnique({
    where: { userId },
  });

  if (!integration) {
    return NextResponse.json({ connected: false }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" },
    });
  }

  const isExpired = integration.expiresAt < new Date();

  return NextResponse.json({
    connected: true,
    linkedinUserId: integration.linkedinUserId,
    linkedinUsername: integration.linkedinUsername,
    expiresAt: integration.expiresAt,
    isExpired,
  }, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" },
  });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  await prisma.linkedInIntegration.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true }, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" },
  });
}
