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

function pageKey(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, "https://placeholder.invalid");
    return url.pathname.replace(/\/+$/, "") || "/";
  } catch {
    return null;
  }
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
    select: { lastOpportunityAnalysisAt: true, selectedSiteDomain: true, selectedSitePanel: true, platformDomain: true },
  });
  const selectedSiteDomain = user.selectedSiteDomain;
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
          run: {
            userId,
            category: {
              panel: selectedPanel,
              ...(selectedSiteDomain ? { siteDomain: selectedSiteDomain } : {}),
            },
          },
          status: "success",
          articleUrl: { not: null },
        },
        select: {
          text: true,
          finalTitle: true,
          articleUrl: true,
          run: { select: { categoryId: true } },
        },
        orderBy: { processedAt: "desc" },
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
    const pageToCategories = new Map<string, Set<string>>();
    for (const title of existing) {
      const key = pageKey(title.articleUrl);
      if (!key) continue;
      const categoryIds = pageToCategories.get(key) ?? new Set<string>();
      categoryIds.add(title.run.categoryId);
      pageToCategories.set(key, categoryIds);
    }

    const categoryEvidence = new Map<string, {
      currentRows: typeof currentRows;
      previousRows: typeof previousRows;
      analyticsPages: Array<{ pagePath?: string; sessions: number; activeUsers: number; engagementRate?: number; conversions?: number }>;
    }>();
    const evidenceFor = (categoryId: string) => {
      const current = categoryEvidence.get(categoryId);
      if (current) return current;
      const created = { currentRows: [], previousRows: [], analyticsPages: [] };
      categoryEvidence.set(categoryId, created);
      return created;
    };
    const assignGscRows = (rows: typeof currentRows, field: "currentRows" | "previousRows") => {
      for (const row of rows) {
        const key = pageKey(row.keys[1]);
        const categoryIds = key ? pageToCategories.get(key) : undefined;
        // Una página publicada en más de una categoría es ambigua: no se
        // entrega a la IA para evitar que la asigne por parecido temático.
        if (!categoryIds || categoryIds.size !== 1) continue;
        evidenceFor([...categoryIds][0])[field].push(row);
      }
    };
    assignGscRows(currentRows, "currentRows");
    assignGscRows(previousRows, "previousRows");

    const mappedCurrentRows = [...categoryEvidence.values()].reduce(
      (total, evidence) => total + evidence.currentRows.length,
      0,
    );
    if (mappedCurrentRows === 0) {
      return NextResponse.json(
        {
          error:
            "No se generaron oportunidades porque ninguna página con señales de Search Console pudo vincularse de forma inequívoca a una categoría publicada. Esto evita asignar temas a la categoría equivocada; verifica que los artículos publicados tengan su URL y categoría sincronizadas.",
        },
        { status: 422 },
      );
    }

    const googleAnalyticsSignals = await getGoogleAnalyticsSignals(userId);
    for (const page of googleAnalyticsSignals.rows) {
      const key = pageKey(page.pagePath);
      const categoryIds = key ? pageToCategories.get(key) : undefined;
      if (!categoryIds || categoryIds.size !== 1) continue;
      evidenceFor([...categoryIds][0]).analyticsPages.push(page);
    }

    const categoriesWithExamples = categories.map((category) => ({
      ...category,
      publishedExamples: examplesByCategory.get(category.id) ?? [],
      evidencePages: [...new Set(existing
        .filter((title) => title.run.categoryId === category.id)
        .map((title) => pageKey(title.articleUrl))
        .filter((value): value is string => Boolean(value)))],
    }));

    const bingSignals = await getBingSignals(userId);
    const analysis = await analyzeSeoOpportunities({
      categories: categoriesWithExamples,
      currentRows,
      previousRows,
      countryRows,
      categoryEvidence: Object.fromEntries(categoryEvidence),
      existingTitles: existing.flatMap((title) =>
        title.finalTitle ? [title.text, title.finalTitle] : [title.text],
      ),
      googleAnalyticsSummary: summarizeGoogleAnalyticsSignals(googleAnalyticsSignals),
      bingSummary: summarizeBingSignals(bingSignals),
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
