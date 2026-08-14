import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function GET() {
  const userId = await getCurrentUserId();

  const [categories, lastSyncJob] = await Promise.all([
    prisma.category.findMany({
      where: { userId, platform: "10minutesWebsite" },
      orderBy: { name: "asc" },
    }),
    prisma.categorySyncJob.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ categories, lastSyncJob });
}

export async function POST(request: import("next/server").NextRequest) {
  const userId = await getCurrentUserId();
  const body = await request.json().catch(() => ({}));
  const { name, externalId } = body;
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name es requerido" }, { status: 400 });
  }
  const cleanName = name.trim();
  const cleanId =
    typeof externalId === "string" && externalId.trim()
      ? externalId.trim()
      : cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const category = await prisma.category.upsert({
    where: {
      userId_platform_externalId: {
        userId,
        platform: "10minutesWebsite",
        externalId: cleanId,
      },
    },
    create: {
      userId,
      platform: "10minutesWebsite",
      externalId: cleanId,
      name: cleanName,
      isSequence: false,
    },
    update: { name: cleanName },
  });

  return NextResponse.json({ ok: true, category });
}
