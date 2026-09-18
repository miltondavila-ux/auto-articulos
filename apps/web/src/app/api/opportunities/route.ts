import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getGoogleAccessToken,
  queryGoogleSearchAnalytics,
} from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { analyzeSeoOpportunities } from "@/lib/opportunity-analysis";
import { getGoogleAnalyticsSignals, summarizeGoogleAnalyticsSignals } from "@/lib/google-analytics-signals";
import { getBingSignals, summarizeBingSignals } from "@/lib/bing-signals";
import { platformProductNameOrNeutral } from "@auto-articulos/shared";


function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function list(userId: string, siteDomain?: string | null) {
  return prisma.opportunityGroup.findMany({
    where: { userId, ...(siteDomain ? { category: { siteDomain } } : {}) },
    orderBy: [{ impressions: "desc" }, { createdAt: "desc" }],
    include: { category: true, titles: { orderBy: { createdAt: "asc" } } },
  });
}

export async function GET() {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { lastOpportunityAnalysisAt: true, selectedSiteDomain: true, selectedSitePanel: true, platformDomain: true },
  });
  return NextResponse.json({
    groups: await list(userId, user.selectedSiteDomain),
    lastAnalysisAt: user.lastOpportunityAnalysisAt,
  });
}

// Borra TODAS las oportunidades pendientes del panel/dominio actual del
// usuario de una sola vez — pedido explícito de Milton (7/9/2026, anotado en
// TO-DO.md): antes solo existía borrado uno por uno o por categoría. Mismo
// alcance por panel/siteDomain que ya usa el análisis (POST) para no tocar
// oportunidades de otro panel (ej. una cuenta con English/Español).
export async function DELETE() {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { selectedSiteDomain: true, selectedSitePanel: true },
  });
  const selectedSiteDomain = user.selectedSiteDomain;
  const selectedPanel = user.selectedSitePanel || "";
  await prisma.opportunityGroup.deleteMany({
    where: {
      userId,
      category: { panel: selectedPanel, ...(selectedSiteDomain ? { siteDomain: selectedSiteDomain } : {}) },
    },
  });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  const pendingCount = await prisma.opportunityTitle.count({
    where: { group: { userId } },
  });
  if (pendingCount > 0) {
    return NextResponse.json(
      {
        error:
          "No se puede actualizar el análisis porque hay oportunidades pendientes por publicar. Publícalas o bórralas primero.",
      },
      { status: 409 },
    );
  }
  // `panel`: en cuentas con varios paneles (ver Category.panel), a cuál se le
  // generan oportunidades. "" = cuenta sin esta función (comportamiento sin
  // cambios) o panel único explícito. Pedido de Milton, 15/8/2026: sin esto,
  // el análisis mezclaba categorías de English y Español en un solo lote sin
  // que la IA tuviera forma de distinguirlas.
  const { panel = "" } = await request
    .json()
    .catch(() => ({ force: false, panel: "" }));
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { lastOpportunityAnalysisAt: true, selectedSiteDomain: true, selectedSitePanel: true, platformDomain: true, clientLocations: true, businessLocations: true, excludedTopics: true },
  });
  const selectedSiteDomain = user.selectedSiteDomain;
  // Ubicaciones REALES declaradas por el dueño de la cuenta (Configuración →
  // Cuenta), no inventadas ni deducidas de evidencia — pedido explícito de
  // Milton, 7/9/2026: combinarlas (origen del cliente x destino del negocio)
  // para títulos ultra geolocalizados (ver REGLA en opportunity-analysis.ts).
  const splitLocations = (value: string | null) =>
    (value ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  const clientLocations = splitLocations(user.clientLocations);
  const businessLocations = splitLocations(user.businessLocations);
  const integration = await prisma.searchIntegration.findFirst({
    where: { userId, provider: "google", ...(selectedSiteDomain ? { siteDomain: selectedSiteDomain } : {}) },
  });
  if (!integration?.siteUrl) {
    return NextResponse.json(
      { error: "Conecta Google Search Console y elige una propiedad primero." },
      { status: 400 },
    );
  }
  const selectedPanel = user.selectedSitePanel || panel;
  const categories = await prisma.category.findMany({
    where: { userId, panel: selectedPanel, source: { not: "archived" }, ...(selectedSiteDomain ? { siteDomain: selectedSiteDomain } : {}) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (categories.length === 0) {
    return NextResponse.json(
      { error: `Sincroniza tus categorías de ${platformProductNameOrNeutral(user.platformDomain)} primero.` },
      { status: 400 },
    );
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
        select: { text: true, finalTitle: true, run: { select: { categoryId: true } } },
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
    // Ejemplos reales de lo que YA se publicó en cada categoría (pedido de
    // Milton, 2/9/2026, caso Guillermo Martínez): el nombre de la categoría
    // sola no basta para que la IA sepa qué tema cubre de verdad. Con hasta
    // 8 títulos ya publicados por categoría, la IA tiene evidencia real del
    // tema exacto en vez de adivinar por el nombre o mezclar categorías.
    const MAX_EXAMPLES_PER_CATEGORY = 30;
    const examplesByCategory = new Map<string, string[]>();
    for (const title of existing) {
      const categoryId = title.run.categoryId;
      const list = examplesByCategory.get(categoryId) ?? [];
      if (list.length < MAX_EXAMPLES_PER_CATEGORY) {
        list.push(title.finalTitle || title.text);
        examplesByCategory.set(categoryId, list);
      }
    }
    const categoriesWithExamples = categories.map((category) => ({
      ...category,
      publishedExamples: examplesByCategory.get(category.id) ?? [],
    }));

    const [googleAnalyticsSignals, bingSignals] = await Promise.all([
      getGoogleAnalyticsSignals(userId),
      getBingSignals(userId),
    ]);
    const analysis = await analyzeSeoOpportunities({
      categories: categoriesWithExamples,
      currentRows,
      previousRows,
      countryRows,
      existingTitles: existing.flatMap((title) =>
        title.finalTitle ? [title.text, title.finalTitle] : [title.text],
      ),
      googleAnalyticsSummary: summarizeGoogleAnalyticsSignals(googleAnalyticsSignals),
      bingSummary: summarizeBingSignals(bingSignals),
      clientLocations,
      businessLocations,
      excludedTopics: user.excludedTopics ?? undefined,
    });

    const now = new Date();

    if (analysis.status === "no_new") {
      await prisma.user.update({
        where: { id: userId },
        data: { lastOpportunityAnalysisAt: now },
      });
      return NextResponse.json({
        groups: await list(userId, selectedSiteDomain),
        lastAnalysisAt: now,
        noNewOpportunities: true,
      });
    }

    await prisma.$transaction(async (tx) => {
      // Solo las de ESTE panel: un análisis para "English" no debe borrar
      // oportunidades ya generadas para "Español".
      await tx.opportunityGroup.deleteMany({
        where: { userId, category: { panel: selectedPanel, ...(selectedSiteDomain ? { siteDomain: selectedSiteDomain } : {}) } },
      });
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
      groups: await list(userId, selectedSiteDomain),
      lastAnalysisAt: now,
    });
  } catch (error) {
    console.error("POST /api/opportunities falló:", error);
    return NextResponse.json({ error: "No se pudo completar el análisis esta vez." }, { status: 500 });
  }
}
