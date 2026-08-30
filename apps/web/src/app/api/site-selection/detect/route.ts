import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { triggerWorkerNow } from "@/lib/trigger-worker";
import { hasTrialAccess } from "@/lib/trial";
import { isStuckSyncJob, STUCK_SYNC_JOB_MESSAGE } from "@/lib/sync-jobs";

/**
 * Encola (o reutiliza) un job de detección real de sitios/paneles: el
 * worker inicia sesión con las credenciales guardadas y lee los paneles que
 * la cuenta ofrece de verdad (ver listPanelLabels/detectSites en el
 * worker), sin descargar categorías todavía. El wizard usa el resultado
 * para que la persona elija un único dominio real antes de sincronizar, en
 * vez de escribirlo a mano sin verificar contra la cuenta.
 */
export async function POST() {
  const userId = await getCurrentUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      isTrialSignup: true,
      trialStartedAt: true,
      trialUnlocked: true,
      siteSelectionConfirmed: true,
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

  if (user?.siteSelectionConfirmed) {
    return NextResponse.json(
      { error: "El dominio de esta cuenta ya está confirmado y no necesita detectarse de nuevo." },
      { status: 400 },
    );
  }

  const credential = await prisma.credential.findUnique({
    where: { userId_platform: { userId, platform: "10minutesWebsite" } },
  });
  if (!credential) {
    return NextResponse.json(
      { error: "Primero debes guardar tus credenciales de la plataforma" },
      { status: 400 },
    );
  }

  const existingActive = await prisma.categorySyncJob.findFirst({
    where: { userId, mode: "detect", status: { in: ["pending", "running"] } },
    orderBy: { createdAt: "desc" },
  });

  if (existingActive) {
    if (!isStuckSyncJob(existingActive.createdAt)) {
      await triggerWorkerNow();
      return NextResponse.json({ job: existingActive });
    }
    await prisma.categorySyncJob.updateMany({
      where: { userId, mode: "detect", status: { in: ["pending", "running"] } },
      data: { status: "error", errorMessage: STUCK_SYNC_JOB_MESSAGE, finishedAt: new Date() },
    });
  }

  const job = await prisma.categorySyncJob.create({
    data: { userId, mode: "detect" },
  });

  await triggerWorkerNow();

  return NextResponse.json({ job });
}

export async function GET() {
  const userId = await getCurrentUserId();
  const job = await prisma.categorySyncJob.findFirst({
    where: { userId, mode: "detect" },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ job });
}
