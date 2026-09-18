import "dotenv/config";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, getGoogleAccessToken, queryGoogleSearchAnalytics } from "@auto-articulos/shared";
import { analyzeSeoOpportunities } from "../src/lib/opportunity-analysis";
import { getGoogleAnalyticsSignals, summarizeGoogleAnalyticsSignals } from "../src/lib/google-analytics-signals";
import { getBingSignals, summarizeBingSignals } from "../src/lib/bing-signals";

// Diagnóstico de solo lectura para la tarea "CREADOR DE TITULOS MUY
// ESTRICTO" (17/9/2026): Milton reportó que la cuenta de Ignacio Cubas no
// tiene oportunidades para publicar. Repite EXACTAMENTE el mismo camino que
// apps/web/src/app/api/opportunities/route.ts (misma ventana de fechas,
// mismos universos de datos), con OPPORTUNITY_DEBUG=1 para ver en qué
// guardarraíl exacto se pierden los candidatos. No escribe nada en la base
// de datos ni en 10minutesWebsite.
process.env.OPPORTUNITY_DEBUG = "1";

async function main() {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "ignacioscubas@gmail.com" },
    select: {
      id: true,
      selectedSiteDomain: true,
      selectedSitePanel: true,
      clientLocations: true,
      businessLocations: true,
      lastOpportunityAnalysisAt: true,
    },
  });
  console.log("Usuario:", JSON.stringify(user, null, 2));

  const selectedSiteDomain = user.selectedSiteDomain;
  const selectedPanel = user.selectedSitePanel || "";

  const categories = await prisma.category.findMany({
    where: {
      userId: user.id,
      panel: selectedPanel,
      source: { not: "archived" },
      ...(selectedSiteDomain ? { siteDomain: selectedSiteDomain } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  console.log(`Categorías activas (panel="${selectedPanel}"): ${categories.length}`);
  console.log(categories.map((c) => c.name).join(" | "));
  if (categories.length === 0) {
    console.log("Sin categorías activas, no se puede continuar la réplica del análisis.");
    await prisma.$disconnect();
    return;
  }

  const integration = await prisma.searchIntegration.findFirst({
    where: { userId: user.id, provider: "google", ...(selectedSiteDomain ? { siteDomain: selectedSiteDomain } : {}) },
  });
  const ga4 = await prisma.searchIntegration.findFirst({
    where: { userId: user.id, provider: "google-analytics", ...(selectedSiteDomain ? { siteDomain: selectedSiteDomain } : {}) },
  });
  const bing = await prisma.searchIntegration.findFirst({
    where: { userId: user.id, provider: "bing", ...(selectedSiteDomain ? { siteDomain: selectedSiteDomain } : {}) },
  });
  console.log("Google Search Console conectado:", !!integration?.siteUrl, integration?.siteUrl ?? "");
  console.log("Google Analytics 4 conectado:", !!ga4?.siteUrl, ga4?.siteUrl ?? "");
  console.log("Bing Webmaster Tools conectado:", !!bing?.siteUrl, bing?.siteUrl ?? "");
  console.log("clientLocations:", user.clientLocations ?? "(vacío)");
  console.log("businessLocations:", user.businessLocations ?? "(vacío)");

  if (!integration?.siteUrl) {
    console.log("Sin Search Console conectado, no se puede continuar la réplica del análisis.");
    await prisma.$disconnect();
    return;
  }

  // MISMA ventana de fechas exacta que route.ts.
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 3);
  const currentStart = new Date(end);
  currentStart.setUTCDate(currentStart.getUTCDate() - 27);
  const previousEnd = new Date(currentStart);
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setUTCDate(previousStart.getUTCDate() - 27);
  const isoDate = (d: Date) => d.toISOString().slice(0, 10);
  console.log("Ventana ACTUAL:", isoDate(currentStart), "a", isoDate(end));
  console.log("Ventana PREVIA:", isoDate(previousStart), "a", isoDate(previousEnd));

  const accessToken = await getGoogleAccessToken(decryptSecret(integration.encryptedRefreshToken));

  const [currentRows, previousRows, countryRows, existing] = await Promise.all([
    queryGoogleSearchAnalytics(accessToken, integration.siteUrl, isoDate(currentStart), isoDate(end)),
    queryGoogleSearchAnalytics(accessToken, integration.siteUrl, isoDate(previousStart), isoDate(previousEnd)),
    queryGoogleSearchAnalytics(accessToken, integration.siteUrl, isoDate(currentStart), isoDate(end), ["country"]),
    prisma.title.findMany({
      where: { run: { userId: user.id }, status: "success", articleUrl: { not: null } },
      select: { text: true, finalTitle: true, run: { select: { categoryId: true } } },
      orderBy: { processedAt: "desc" },
      take: 1000,
    }),
  ]);
  console.log(`Filas Search Console (query+page) ventana ACTUAL: ${currentRows.length}`);
  console.log(`Filas Search Console (query+page) ventana PREVIA: ${previousRows.length}`);
  console.log(`Filas Search Console por país (ventana ACTUAL): ${countryRows.length}`);
  console.log(`Consultas (query) distintas en la ventana ACTUAL: ${new Set(currentRows.map((r) => r.keys[0])).size}`);
  console.log(`Títulos ya publicados en toda la cuenta: ${existing.length}`);

  if (currentRows.length === 0) {
    console.log("Search Console sin datos de rendimiento: esta es la causa raíz, no el algoritmo.");
    await prisma.$disconnect();
    return;
  }

  const top = [...currentRows].sort((a, b) => b.impressions - a.impressions).slice(0, 15);
  console.log("Top 15 filas por impresiones (ventana ACTUAL):");
  console.log(JSON.stringify(top, null, 2));

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
    getGoogleAnalyticsSignals(user.id),
    getBingSignals(user.id),
  ]);
  const gaSummary = summarizeGoogleAnalyticsSignals(googleAnalyticsSignals);
  const bingSummary = summarizeBingSignals(bingSignals);
  console.log("Resumen Google Analytics:", JSON.stringify({ connected: gaSummary.connected, totalPages: gaSummary.totalPages, error: gaSummary.error }, null, 2));
  console.log("Resumen Bing:", JSON.stringify({ connected: bingSummary.connected, totalQueries: bingSummary.totalQueries, error: bingSummary.error }, null, 2));

  const splitLocations = (value: string | null) =>
    (value ?? "").split(",").map((v) => v.trim()).filter(Boolean);

  console.log("\n=== EJECUTANDO analyzeSeoOpportunities REAL (misma llamada que produccion) ===\n");
  const analysis = await analyzeSeoOpportunities({
    categories: categoriesWithExamples,
    currentRows,
    previousRows,
    countryRows,
    existingTitles: existing.flatMap((title) => (title.finalTitle ? [title.text, title.finalTitle] : [title.text])),
    googleAnalyticsSummary: gaSummary,
    bingSummary: bingSummary,
    clientLocations: splitLocations(user.clientLocations),
    businessLocations: splitLocations(user.businessLocations),
  });

  console.log("\n=== RESULTADO FINAL ===");
  console.log("status:", analysis.status);
  if (analysis.status === "ok") {
    console.log(`Categorias con oportunidades: ${analysis.groups.length}`);
    console.log(`Total de titulos: ${analysis.groups.reduce((sum, g) => sum + g.titles.length, 0)}`);
    for (const g of analysis.groups) {
      console.log(`- ${g.categoryId}: ${g.titles.length} titulos`);
      for (const t of g.titles) console.log(`    · ${t.text}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exitCode = 1;
});
