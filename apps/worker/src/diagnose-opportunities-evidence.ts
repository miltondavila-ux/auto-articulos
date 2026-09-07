import "dotenv/config";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, getGoogleAccessToken, queryGoogleSearchAnalytics } from "@auto-articulos/shared";

// Diagnóstico puntual de solo lectura (7/9/2026): Milton preguntó por qué el
// análisis de oportunidades le dio solo 2 categorías con 1 título cada una,
// cuando esperaba mucha más variedad de datos de los últimos ~90 días de
// Search Console, GA4 y Bing. Este script repite EXACTAMENTE las mismas
// consultas y la misma ventana de fechas que usa
// apps/web/src/app/api/opportunities/route.ts, para medir cuánta evidencia
// real llegó, sin adivinar. No escribe nada en la base de datos.
async function main() {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "lorenalvarez30@gmail.com" },
    select: { id: true, selectedSiteDomain: true, selectedSitePanel: true },
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

  if (!integration?.siteUrl) {
    console.log("Sin Search Console conectado, no se puede continuar la réplica del análisis.");
    await prisma.$disconnect();
    return;
  }

  // MISMA ventana de fechas exacta que route.ts (27 dias actuales + 27 dias
  // previos, terminando 3 dias atras) — para confirmar si en verdad son ~90
  // dias o menos.
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
  console.log(
    "Total de dias cubiertos por ambas ventanas combinadas:",
    Math.round((end.getTime() - previousStart.getTime()) / 86400000),
  );

  const accessToken = await getGoogleAccessToken(decryptSecret(integration.encryptedRefreshToken));

  const [currentRows, previousRows, countryRows] = await Promise.all([
    queryGoogleSearchAnalytics(accessToken, integration.siteUrl, isoDate(currentStart), isoDate(end)),
    queryGoogleSearchAnalytics(accessToken, integration.siteUrl, isoDate(previousStart), isoDate(previousEnd)),
    queryGoogleSearchAnalytics(accessToken, integration.siteUrl, isoDate(currentStart), isoDate(end), ["country"]),
  ]);
  console.log(`Filas Search Console (query+page) ventana ACTUAL: ${currentRows.length}`);
  console.log(`Filas Search Console (query+page) ventana PREVIA: ${previousRows.length}`);
  console.log(`Filas Search Console por país (ventana ACTUAL): ${countryRows.length}`);

  const distinctQueries = new Set(currentRows.map((r) => r.keys[0])).size;
  console.log(`Consultas (query) distintas en la ventana ACTUAL: ${distinctQueries}`);

  // Top 10 por impresiones, para ver de un vistazo si hay volumen real.
  const top = [...currentRows].sort((a, b) => b.impressions - a.impressions).slice(0, 10);
  console.log("Top 10 filas por impresiones (ventana ACTUAL):");
  console.log(JSON.stringify(top, null, 2));

  const existing = await prisma.title.findMany({
    where: { run: { userId: user.id } },
    select: { text: true, finalTitle: true },
  });
  console.log(`Títulos ya existentes (publicados/en proceso) en toda la cuenta: ${existing.length}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exitCode = 1;
});
