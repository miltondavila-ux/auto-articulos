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

  const existingActive = await prisma.categorySyncJob.findFirst({
    where: { userId, status: { in: ["pending", "running"] } },
    orderBy: { createdAt: "desc" },
  });

  if (existingActive) {
    if (!isStuckSyncJob(existingActive.createdAt)) {
      // Sigue realmente en curso: se reutiliza en vez de encolar un duplicado.
      // Se vuelve a empujar al worker porque el disparo anterior pudo perderse
      // (ver triggerWorkerNow: no dispara si ya había una corrida activa, y esa
      // corrida puede haber terminado su presupuesto sin llegar a este job).
      await triggerWorkerNow();
      return NextResponse.json({ job: existingActive });
    }

    // Job muerto: se descarta para que este clic pueda crear uno nuevo, en vez
    // de devolver otra vez el que ya nunca va a terminar.
    await prisma.categorySyncJob.updateMany({
      where: { userId, status: { in: ["pending", "running"] } },
      data: {
        status: "error",
        errorMessage: STUCK_SYNC_JOB_MESSAGE,
        finishedAt: new Date(),
      },
    });
  }

  const job = await prisma.categorySyncJob.create({
    data: { userId },
  });

  await triggerWorkerNow();

  return NextResponse.json({ job });
}
