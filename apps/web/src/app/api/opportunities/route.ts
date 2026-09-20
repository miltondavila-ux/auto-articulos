import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import {
  composioQuerySearchAnalytics,
  decryptSecret,
  getGoogleAccessToken,
  queryGoogleSearchAnalytics,
} from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { resolveSearchConsoleForUser } from "@/lib/composio-search-console-consumer";
import { analyzeSeoOpportunities } from "@/lib/opportunity-analysis";
import { getGoogleAnalyticsSignals, summarizeGoogleAnalyticsSignals } from "@/lib/google-analytics-signals";
import { getBingSignals, summarizeBingSignals } from "@/lib/bing-signals";
import {
  readFreshOpportunityEvidenceCache,
  writeOpportunityEvidenceCache,
} from "@/lib/opportunity-evidence-cache";
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
    // Ventana de evidencia: 90 días consecutivos (45 actuales + 45 de
    // comparación), dejando los últimos 3 días fuera por el retraso normal
    // de Search Console. Las fuentes GA4/Bing conservan sus periodos propios
    // y se fusionan después, sin hacer depender la cobertura de una sola API.
    const end = new Date();
    end.setUTCDate(end.getUTCDate() - 3);
    const currentStart = new Date(end);
    currentStart.setUTCDate(currentStart.getUTCDate() - 44);
    const previousEnd = new Date(currentStart);
    previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setUTCDate(previousStart.getUTCDate() - 44);
    const existingPromise = prisma.title.findMany({
      where: {
        run: { userId },
        status: "success",
        articleUrl: { not: null },
      },
      select: { text: true, finalTitle: true, run: { select: { categoryId: true } } },
      orderBy: { processedAt: "desc" },
      take: 1000,
    });
    const cacheScope = { userId, siteDomain: selectedSiteDomain, panel: selectedPanel };
    const cachedGsc = await readFreshOpportunityEvidenceCache<{
      currentRows: Awaited<ReturnType<typeof queryGoogleSearchAnalytics>>;
      previousRows: Awaited<ReturnType<typeof queryGoogleSearchAnalytics>>;
      countryRows: Awaited<ReturnType<typeof queryGoogleSearchAnalytics>>;
    }>({ ...cacheScope, source: "gsc" });
    let currentRows = cachedGsc?.currentRows ?? [];
    let previousRows = cachedGsc?.previousRows ?? [];
    let countryRows = cachedGsc?.countryRows ?? [];
    if (!cachedGsc && integration?.siteUrl) {
      const resolved = await resolveSearchConsoleForUser(userId, integration.siteDomain);
      const query = resolved.source === "COMPOSIO"
        ? resolved.apiKey && resolved.state.composio?.connectedAccountId && resolved.state.composio.siteUrl
          ? (start: string, finish: string, dimensions?: string[]) => composioQuerySearchAnalytics(
              { apiKey: resolved.apiKey!, userId, connectedAccountId: resolved.state.composio!.connectedAccountId },
              resolved.state.composio!.siteUrl!, start, finish, dimensions,
            )
          : (() => { throw new Error("Search Console requiere reconectar la cuenta por Composio y seleccionar un sitio."); })
        : async (start: string, finish: string, dimensions?: string[]) => queryGoogleSearchAnalytics(
            await getGoogleAccessToken(decryptSecret(integration.encryptedRefreshToken)),
            integration.siteUrl!, start, finish, dimensions,
          );
      [currentRows, previousRows, countryRows] = await Promise.all([
        query(isoDate(currentStart), isoDate(end)),
        query(isoDate(previousStart), isoDate(previousEnd)),
        // Distribución geográfica real por país; las ciudades se obtienen de
        // las consultas y del contexto declarado, no de esta dimensión.
        query(isoDate(currentStart), isoDate(end), ["country"]),
      ]);
      await writeOpportunityEvidenceCache(
        { ...cacheScope, source: "gsc" },
        JSON.parse(JSON.stringify({ currentRows, previousRows, countryRows })),
        previousStart,
        end,
      );
    }
    const existing = await existingPromise;
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
      readFreshOpportunityEvidenceCache<{ connected: boolean; propertyId?: string; rows: Array<{ pagePath?: string; sessions: number; activeUsers: number; engagementRate?: number; conversions?: number }>; error?: string }>({ ...cacheScope, source: "ga4" }).then(async (cached) => {
        if (cached) return cached;
        const fresh = await getGoogleAnalyticsSignals(userId);
        if (fresh.connected) {
          await writeOpportunityEvidenceCache({ ...cacheScope, source: "ga4" }, JSON.parse(JSON.stringify(fresh)));
        }
        return fresh;
      }),
      readFreshOpportunityEvidenceCache<{ connected: boolean; siteUrl?: string; rows: Array<{ query: string; clicks: number; impressions: number; position: number }>; error?: string }>({ ...cacheScope, source: "bing" }).then(async (cached) => {
        if (cached) return cached;
        const fresh = await getBingSignals(userId);
        if (fresh.connected) {
          await writeOpportunityEvidenceCache({ ...cacheScope, source: "bing" }, JSON.parse(JSON.stringify(fresh)));
        }
        return fresh;
      }),
    ]);
    if (currentRows.length === 0 && googleAnalyticsSignals.rows.length === 0 && bingSignals.rows.length === 0) {
      return NextResponse.json(
        { error: "No hay evidencia disponible en GSC, Google Analytics o Bing Webmaster Tools." },
        { status: 422 },
      );
    }
    const externalEvidenceRows = [
      ...googleAnalyticsSignals.rows.map((row) => ({
        source: "google-analytics-4",
        query: row.pagePath ?? "",
        page: row.pagePath ?? "",
        clicks: 0,
        impressions: row.sessions,
        ctr: 0,
        position: 0,
      })),
      ...bingSignals.rows.map((row) => ({
        source: "bing-webmaster-tools",
        query: row.query,
        page: "",
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.impressions > 0 ? row.clicks / row.impressions : 0,
        position: row.position,
      })),
    ];
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
      externalEvidenceRows,
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
