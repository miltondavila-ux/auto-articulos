import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { triggerWorkerNow } from "@/lib/trigger-worker";

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
  const { disableIndexing, contentLanguage } = (await request
    .json()
    .catch(() => ({}))) as {
    disableIndexing?: boolean;
    contentLanguage?: string;
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
      select: { maxTitlesPerBatch: true },
    }),
  ]);
  if (!credential) {
    return NextResponse.json(
      { error: "Primero guarda tus credenciales de 10minutesWebsite." },
      { status: 400 },
    );
  }
  if (activeRun) {
    return NextResponse.json(
      { error: "Ya tienes una ejecución en curso. Espera a que termine." },
      { status: 409 },
    );
  }

  const groups = await prisma.opportunityGroup.findMany({
    where: { userId },
    include: { titles: { orderBy: { createdAt: "asc" } } },
  });
  if (groups.length === 0) {
    return NextResponse.json(
      { error: "No hay oportunidades guardadas para publicar." },
      { status: 400 },
    );
  }

  const totalTitles = groups.reduce((sum, g) => sum + g.titles.length, 0);
  if (totalTitles > user.maxTitlesPerBatch) {
    return NextResponse.json(
      {
        error: `Tienes ${totalTitles} títulos en ${groups.length} categorías, más de tu máximo de ${user.maxTitlesPerBatch} por lote. No se publicó ninguna. Publica categoría por categoría con "Ejecutar categoría", elimina algunos títulos primero, o pide al administrador que aumente tu máximo.`,
      },
      { status: 400 },
    );
  }

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
          titles: {
            create: group.titles.map((title, order) => ({
              text: title.text,
              order,
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
  return NextResponse.json({ ok: true, runIds });
}
