import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getGoogleAccessToken,
  queryGoogleSearchAnalytics,
} from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { analyzeSeoOpportunities } from "@/lib/opportunity-analysis";

const COOLDOWN_DAYS = 3;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function list(userId: string) {
  return prisma.opportunityGroup.findMany({
    where: { userId },
    orderBy: [{ impressions: "desc" }, { createdAt: "desc" }],
    include: { category: true, titles: { orderBy: { createdAt: "asc" } } },
  });
}

export async function GET() {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { lastOpportunityAnalysisAt: true },
  });
  return NextResponse.json({
    groups: await list(userId),
    lastAnalysisAt: user.lastOpportunityAnalysisAt,
  });
}

export async function POST() {
  const userId = await getCurrentUserId();
  const integration = await prisma.searchIntegration.findUnique({
    where: { userId_provider: { userId, provider: "google" } },
  });
  if (!integration?.siteUrl) {
    return NextResponse.json(
      { error: "Conecta Google Search Console y elige una propiedad primero." },
      { status: 400 },
    );
  }
  const categories = await prisma.category.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (categories.length === 0) {
    return NextResponse.json(
      { error: "Sincroniza tus categorías de 10minutesWebsite primero." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { lastOpportunityAnalysisAt: true },
  });
  // Pedido explícito del usuario: si la última corrida no encontró nada
  // nuevo, no dejar reintentar antes de 3 días (le da tiempo real a que
  // cambien los datos de Search Console) en vez de gastar otra consulta a
  // la IA para muy probablemente confirmar lo mismo.
  const existingGroupsCount = await prisma.opportunityGroup.count({
    where: { userId },
  });
  if (
    existingGroupsCount === 0 &&
    user.lastOpportunityAnalysisAt &&
    Date.now() - user.lastOpportunityAnalysisAt.getTime() < COOLDOWN_MS
  ) {
    const nextAvailableAt = new Date(
      user.lastOpportunityAnalysisAt.getTime() + COOLDOWN_MS,
    );
    return NextResponse.json({
      groups: [],
      lastAnalysisAt: user.lastOpportunityAnalysisAt,
      noNewOpportunities: true,
      nextAvailableAt,
    });
  }

  try {
    const end = new Date();
    end.setUTCDate(end.getUTCDate() - 3);
    const currentStart = new Date(end);
    currentStart.setUTCDate(currentStart.getUTCDate() - 27);
    const previousEnd = new Date(currentStart);
    previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setUTCDate(previousStart.getUTCDate() - 27);
    const accessToken = await getGoogleAccessToken(
      decryptSecret(integration.encryptedRefreshToken),
    );
    const [currentRows, previousRows, countryRows, existing] = await Promise.all([
      queryGoogleSearchAnalytics(
        accessToken,
        integration.siteUrl,
        isoDate(currentStart),
        isoDate(end),
      ),
      queryGoogleSearchAnalytics(
        accessToken,
        integration.siteUrl,
        isoDate(previousStart),
        isoDate(previousEnd),
      ),
      // Distribución geográfica real (países que ya generan impresiones/clics)
      // para que el análisis de oportunidades pueda segmentar títulos por
      // ubicación real en vez de inventarla — pedido explícito del usuario,
      // 5/8/2026. Search Console no expone ciudad como dimensión propia; el
      // nivel de ciudad/condado se infiere del texto real de las consultas.
      queryGoogleSearchAnalytics(
        accessToken,
        integration.siteUrl,
        isoDate(currentStart),
        isoDate(end),
        ["country"],
      ),
      prisma.title.findMany({
        where: {
          run: { userId },
          status: "success",
          articleUrl: { not: null },
        },
        select: { text: true, finalTitle: true },
        orderBy: { processedAt: "desc" },
        take: 1000,
      }),
    ]);
    if (currentRows.length === 0) {
      return NextResponse.json(
        {
          error:
            "Search Console todavía no tiene datos de rendimiento para esta propiedad.",
        },
        { status: 422 },
      );
    }
    const analysis = await analyzeSeoOpportunities({
      categories,
      currentRows,
      previousRows,
      countryRows,
      existingTitles: existing.flatMap((title) =>
        title.finalTitle ? [title.text, title.finalTitle] : [title.text],
      ),
    });

    const now = new Date();

    if (analysis.status === "no_new") {
      await prisma.user.update({
        where: { id: userId },
        data: { lastOpportunityAnalysisAt: now },
      });
      return NextResponse.json({
        groups: await list(userId),
        lastAnalysisAt: now,
        noNewOpportunities: true,
        nextAvailableAt: new Date(now.getTime() + COOLDOWN_MS),
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.opportunityGroup.deleteMany({ where: { userId } });
      for (const group of analysis.groups) {
        await tx.opportunityGroup.create({
          data: {
            userId,
            categoryId: group.categoryId,
            rationale: group.rationale,
            impressions: group.impressions,
            clicks: group.clicks,
            titles: { create: group.titles },
          },
        });
      }
      await tx.user.update({
        where: { id: userId },
        data: { lastOpportunityAnalysisAt: now },
      });
    });
    return NextResponse.json({
      groups: await list(userId),
      lastAnalysisAt: now,
    });
  } catch (error) {
    console.error("POST /api/opportunities falló:", error);
    return NextResponse.json({ error: "No se pudo completar el análisis esta vez." }, { status: 500 });
  }
}
