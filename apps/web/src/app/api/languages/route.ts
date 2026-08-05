import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function GET() {
  const userId = await getCurrentUserId();

  const [languages, lastSyncJob] = await Promise.all([
    prisma.language.findMany({
      where: { userId, platform: "10minutesWebsite" },
      orderBy: { name: "asc" },
    }),
    prisma.languageSyncJob.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ languages, lastSyncJob });
}
