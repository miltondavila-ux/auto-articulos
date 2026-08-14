import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { triggerWorkerNow } from "@/lib/trigger-worker";
import { hasTrialAccess } from "@/lib/trial";

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

  const existingPending = await prisma.categorySyncJob.findFirst({
    where: { userId, status: { in: ["pending", "running"] } },
  });
  if (existingPending) {
    return NextResponse.json({ job: existingPending });
  }

  const job = await prisma.categorySyncJob.create({
    data: { userId },
  });

  await triggerWorkerNow();

  return NextResponse.json({ job });
}
