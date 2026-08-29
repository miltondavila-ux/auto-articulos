import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { triggerWorkerNow } from "@/lib/trigger-worker";
import { hasTrialAccess } from "@/lib/trial";

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  const { type, id, ids, disableIndexing, contentLanguage, promptId } =
    (await request.json()) as {
      type?: string;
      id?: string;
      ids?: string[];
      disableIndexing?: boolean;
      contentLanguage?: string;
      promptId?: string;
      confirmedImageCredits?: boolean;
    };
  const selectedIds = type === "titles" && Array.isArray(ids)
    ? [...new Set(ids.filter((candidate): candidate is string => typeof candidate === "string" && candidate.length > 0))]
    : [];
  if ((type !== "group" && type !== "title" && type !== "titles") || (type !== "titles" && !id) || (type === "titles" && selectedIds.length === 0)) {
    return NextResponse.json({ error: "Selección inválida." }, { status: 400 });
  }
  const [credential, activeRun, user] = await Promise.all([
    prisma.credential.findUnique({
      where: { userId_platform: { userId, platform: "10minutesWebsite" } },
      select: { id: true },
    }),
    prisma.run.findFirst({
      where: { userId, status: { in: ["pending", "running"] } },
      select: { id: true },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        role: true,
        isTrialSignup: true,
        trialStartedAt: true,
        trialUnlocked: true,
        maxTitlesPerBatch: true,
        contentLanguage: true,
        hasImageCredits: true,
        defaultPromptId: true,
      },
    }),
  ]);
  if (!hasTrialAccess(user)) {
    return NextResponse.json(
      {
        error:
          "Tu período de prueba gratuita ha finalizado. Contacta al administrador para desbloquear tu cuenta.",
        code: "TRIAL_EXPIRED",
      },
      { status: 403 },
    );
  }
  if (!credential) {
    return NextResponse.json(
      { error: "Primero guarda tus credenciales de 10minutesWebsite." },
      { status: 400 },
    );
  }
  const effectiveLanguage =
    typeof contentLanguage === "string" && contentLanguage.trim()
      ? contentLanguage.trim()
      : user.contentLanguage?.trim() || "";
  if (!effectiveLanguage) {
    return NextResponse.json(
      {
        error:
          "Debes configurar tu idioma de redacción en Configuración antes de ejecutar oportunidades.",
      },
      { status: 400 },
    );
  }
  if (activeRun) {
    return NextResponse.json(
      { error: "Ya tienes una ejecución en curso. Espera a que termine." },
      { status: 409 },
    );
  }

  const group = await prisma.opportunityGroup.findFirst({
    where:
      type === "group"
        ? { id, userId }
        : { userId, titles: { some: { id: type === "titles" ? { in: selectedIds } : id } } },
    include: { titles: { orderBy: { createdAt: "asc" } }, category: true },
  });
  if (!group) {
    console.error("opportunities/execute: not found", { userId, type, id });
    return NextResponse.json(
      { error: "Oportunidad no encontrada." },
      { status: 404 },
    );
  }
  const selected =
    type === "group"
      ? group.titles
      : group.titles.filter((title) => type === "titles" ? selectedIds.includes(title.id) : title.id === id);
  if (type === "titles" && selected.length !== selectedIds.length) {
    return NextResponse.json(
      { error: "Los títulos seleccionados deben pertenecer a la misma categoría." },
      { status: 400 },
    );
  }
  if (selected.length === 0) {
    return NextResponse.json(
      { error: "No hay títulos para ejecutar." },
      { status: 400 },
    );
  }
  // Un grupo grande no se rechaza ni desaparece: se divide en Runs de como
  // máximo el cupo permitido. Así una categoría con 33 títulos puede empezar
  // con dos Runs (por ejemplo 20 + 13) y todos sus títulos siguen trazables.
  const chunks: (typeof selected)[] = [];
  for (let offset = 0; offset < selected.length; offset += user.maxTitlesPerBatch) {
    chunks.push(selected.slice(offset, offset + user.maxTitlesPerBatch));
  }

  const runs = await prisma.$transaction(async (tx) => {
    const createdRuns: { id: string }[] = [];
    for (const chunk of chunks) {
      const created = await tx.run.create({
        data: {
          userId,
          categoryId: group.categoryId,
          status: "running",
          disableIndexing: Boolean(disableIndexing),
          // Ver POST /api/runs: vacío deja NULL y el worker usa el idioma
          // configurado del usuario.
          contentLanguage:
            typeof contentLanguage === "string" && contentLanguage.trim()
              ? contentLanguage.trim()
              : null,
          promptId:
            typeof promptId === "string" && promptId.trim()
              ? promptId.trim()
              : user.defaultPromptId,
          titles: {
            create: chunk.map((title, order) => ({
              text: title.text,
              order,
              opportunityCreatedAt: group.createdAt,
            })),
          },
        },
        select: { id: true },
      });
      createdRuns.push(created);
    }
    if (type === "group") {
      await tx.opportunityGroup.delete({ where: { id: group.id } });
    } else {
      await tx.opportunityTitle.deleteMany({ where: { id: { in: selected.map((title) => title.id) }, groupId: group.id } });
      const remaining = await tx.opportunityTitle.count({
        where: { groupId: group.id },
      });
      if (remaining === 0)
        await tx.opportunityGroup.delete({ where: { id: group.id } });
    }
    return createdRuns;
  });
  const worker = await triggerWorkerNow();
  return NextResponse.json({
    ok: true,
    runId: runs[0].id,
    runIds: runs.map((run) => run.id),
    workerStarted: worker.started,
    workerAlreadyActive: worker.alreadyActive ?? false,
    workerWarning: worker.reason
      ? "La publicación quedó creada, pero el worker no pudo iniciarse de inmediato. El sistema la retomará en el próximo ciclo automático."
      : null,
  });
}
