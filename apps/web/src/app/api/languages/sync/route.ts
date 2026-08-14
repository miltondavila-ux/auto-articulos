import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { triggerWorkerNow } from "@/lib/trigger-worker";
import { hasTrialAccess } from "@/lib/trial";
import { isStuckSyncJob, STUCK_SYNC_JOB_MESSAGE } from "@/lib/sync-jobs";

export async function POST() {
  const userId = await getCurrentUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      isTrialSignup: true,
      trialStartedAt: true,
      trialUnlocked: true,
    },
  });

  if (user && !hasTrialAccess(user)) {
    return NextResponse.json(
      {
        error:
          "Tu período de prueba gratuita ha finalizado. Contacta al administrador para desbloquear tu cuenta.",
      },
      { status: 403 },
    );
  }

  const credential = await prisma.credential.findUnique({
    where: { userId_platform: { userId, platform: "10minutesWebsite" } },
  });
  if (!credential) {
    return NextResponse.json(
      { error: "Primero debes guardar tus credenciales de 10minutesWebsite" },
      { status: 400 }
    );
  }

  const existingActive = await prisma.languageSyncJob.findFirst({
    where: { userId, status: { in: ["pending", "running"] } },
    orderBy: { createdAt: "desc" },
  });

  if (existingActive) {
    if (!isStuckSyncJob(existingActive.createdAt)) {
      await triggerWorkerNow();
      return NextResponse.json({ job: existingActive });
    }

    // Mismo desbloqueo que en /api/categories/sync: un job muerto no debe
    // impedir que este clic encole un intento nuevo.
    await prisma.languageSyncJob.updateMany({
      where: { userId, status: { in: ["pending", "running"] } },
      data: {
        status: "error",
        errorMessage: STUCK_SYNC_JOB_MESSAGE,
        finishedAt: new Date(),
      },
    });
  }

  const job = await prisma.languageSyncJob.create({
    data: { userId },
  });

  await triggerWorkerNow();

  return NextResponse.json({ job });
}
