import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { triggerWorkerNow } from "@/lib/trigger-worker";

export async function POST() {
  const userId = await getCurrentUserId();

  const credential = await prisma.credential.findUnique({
    where: { userId_platform: { userId, platform: "10minutesWebsite" } },
  });
  if (!credential) {
    return NextResponse.json(
      { error: "Primero debes guardar tus credenciales de 10minutesWebsite" },
      { status: 400 }
    );
  }

  const existingPending = await prisma.languageSyncJob.findFirst({
    where: { userId, status: { in: ["pending", "running"] } },
  });
  if (existingPending) {
    return NextResponse.json({ job: existingPending });
  }

  const job = await prisma.languageSyncJob.create({
    data: { userId },
  });

  await triggerWorkerNow();

  return NextResponse.json({ job });
}
