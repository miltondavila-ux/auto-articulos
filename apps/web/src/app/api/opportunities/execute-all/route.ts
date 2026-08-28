import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { triggerWorkerNow } from "@/lib/trigger-worker";
import { hasTrialAccess } from "@/lib/trial";

// Publica TODAS las categorías de Oportunidades de una sola vez — pedido
// explícito del usuario (8/8/2026). Cada categoría se convierte en un Run
// propio (Run.categoryId es una sola categoría por diseño, ver schema.prisma),
// igual que ya hace POST /api/opportunities/execute con type:"group" para UNA
// categoría; esto simplemente repite ese mismo patrón para todas a la vez, en
// una sola transacción.
//
// Regla explícita del usuario: si la SUMA de títulos de todas las categorías
// supera el máximo por lote del usuario (User.maxTitlesPerBatch, 20 por
// defecto), se rechaza TODO — no se publica ninguna categoría parcialmente.
// El usuario prefiere que se le diga "no puedo" a que se publique una parte y
// se le pierda de vista el resto.
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  const { disableIndexing, contentLanguage, promptId, confirmedImageCredits } = (await request
    .json()
    .catch(() => ({}))) as {
    disableIndexing?: boolean;
    contentLanguage?: string;
    promptId?: string;
    confirmedImageCredits?: boolean;
  };

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
  if (!user.hasImageCredits && confirmedImageCredits !== true) {
    return NextResponse.json(
      {
        error:
          "Tu cuenta de 10minutesWebsite no tiene créditos de imagen disponibles. Solicita más créditos gratuitos en https://www.10minuteswebsite.com/ayuda",
        code: "NO_IMAGE_CREDITS",
      },
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

  let groups = await prisma.opportunityGroup.findMany({
    where: { userId },
    include: { titles: { orderBy: { createdAt: "asc" } } },
  });
  if (groups.length === 0) {
    return NextResponse.json(
      { error: "No hay oportunidades guardadas para publicar." },
      { status: 400 },
    );
  }


  /*
   * Cupo. Antes, pasarse del máximo por lote rechazaba TODO y la persona se
   * quedaba sin publicar nada. Pedido de Milton (19/8/2026): publicar lo que
   * cabe y avisar. Se recorta por categorías completas, no partiéndolas: una
   * categoría a medias dejaría oportunidades sueltas sin su contexto.
   */
  const gruposQueCaben: typeof groups = [];
  let acumulado = 0;
  for (const grupo of groups) {
    if (acumulado + grupo.titles.length > user.maxTitlesPerBatch) break;
    gruposQueCaben.push(grupo);
    acumulado += grupo.titles.length;
  }

  if (gruposQueCaben.length === 0) {
    const primera = groups[0];
    return NextResponse.json(
      {
        error: `Tu máximo es de ${user.maxTitlesPerBatch} títulos por lote y la primera categoría ya tiene ${primera.titles.length}. Elimina algunos títulos de esa categoría, o pide al administrador que aumente tu máximo.`,
      },
      { status: 400 },
    );
  }

  const gruposFuera = groups.length - gruposQueCaben.length;
  const avisoDeCupo =
    gruposFuera > 0
      ? `Se enviaron a publicar ${acumulado} títulos de ${gruposQueCaben.length} categoría(s), porque tu máximo es de ${user.maxTitlesPerBatch} por lote. Las otras ${gruposFuera} categoría(s) quedaron pendientes: vuelve mañana y publícalas de nuevo.`
      : null;

  groups = gruposQueCaben;

  const normalizedContentLanguage =
    typeof contentLanguage === "string" && contentLanguage.trim()
      ? contentLanguage.trim()
      : null;

  const runIds = await prisma.$transaction(async (tx) => {
    const ids: string[] = [];
    for (const group of groups) {
      const created = await tx.run.create({
        data: {
          userId,
          categoryId: group.categoryId,
          status: "running",
          disableIndexing: Boolean(disableIndexing),
          contentLanguage: normalizedContentLanguage,
          promptId:
            typeof promptId === "string" && promptId.trim()
              ? promptId.trim()
              : user.defaultPromptId,
          titles: {
            create: group.titles.map((title, order) => ({
              text: title.text,
              order,
              opportunityCreatedAt: group.createdAt,
            })),
          },
        },
        select: { id: true },
      });
      ids.push(created.id);
      // Cascade en el schema borra las OpportunityTitle de este grupo junto
      // con el grupo.
      await tx.opportunityGroup.delete({ where: { id: group.id } });
    }
    return ids;
  });

  await triggerWorkerNow();
  return NextResponse.json({ ok: true, runIds, avisoDeCupo });
}
