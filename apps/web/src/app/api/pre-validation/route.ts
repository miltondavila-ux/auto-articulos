import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { platformHelpUrl, platformProductNameOrNeutral } from "@auto-articulos/shared";

export async function GET() {
  const userId = await getCurrentUserId();
  const account = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true, platformDomain: true } });
  const productName = platformProductNameOrNeutral(account.platformDomain);

  const [credential, categories, user, googleIntegration] = await Promise.all([
    prisma.credential.findUnique({
      where: { userId_platform: { userId, platform: "10minutesWebsite" } },
      select: { updatedAt: true },
    }),
    prisma.category.findMany({
      where: { userId, source: { not: "archived" } },
      select: { id: true, isSequence: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        contentLanguage: true,
        hasImageCredits: true,
      },
    }),
    prisma.searchIntegration.findFirst({
      where: { userId, provider: "google", ...(account.selectedSiteDomain ? { siteDomain: account.selectedSiteDomain } : {}) },
      select: { siteUrl: true },
    }),
  ]);

  const credentialsConfigured = Boolean(credential);
  const regularCategoriesCount = categories.filter((c) => !c.isSequence).length;
  const sequenceCategoriesCount = categories.filter((c) => c.isSequence).length;
  const hasCategories = categories.length > 0;
  const hasContentLanguage = Boolean(user?.contentLanguage && user.contentLanguage.trim().length > 0);
  const contentLanguage = user?.contentLanguage ?? "";
  const googleConnected = Boolean(googleIntegration);
  const hasGoogleSiteUrl = Boolean(googleIntegration?.siteUrl);
  const googleSiteUrl = googleIntegration?.siteUrl ?? null;
  const hasImageCredits = user?.hasImageCredits ?? true;

  const missingForPublish: Array<{
    id: string;
    label: string;
    description: string;
    actionUrl: string;
    actionLabel: string;
  }> = [];

  const missingForOpportunities: Array<{
    id: string;
    label: string;
    description: string;
    actionUrl: string;
    actionLabel: string;
  }> = [];

  if (!credentialsConfigured) {
    const credItem = {
      id: "credentials",
      label: `${productName} no conectado`,
      description: `Primero debes conectar tus credenciales de ${productName} para poder publicar.`,
      actionUrl: "/dashboard/configuracion?tab=platform#credentials",
      actionLabel: `Conectar ${productName}`,
    };
    missingForPublish.push(credItem);
    missingForOpportunities.push(credItem);
  }

  if (!hasCategories) {
    const catItem = {
      id: "categories",
      label: "Sin categorías sincronizadas",
      description: `Debes sincronizar al menos una categoría desde ${productName} para organizar tus artículos.`,
      actionUrl: "/dashboard/configuracion?tab=platform#categories",
      actionLabel: "Sincronizar categorías",
    };
    missingForPublish.push(catItem);
    missingForOpportunities.push(catItem);
  }

  if (!hasContentLanguage) {
    const langItem = {
      id: "language",
      label: "Idioma de redacción no configurado",
      description: "Configura el idioma principal en el que la IA escribirá tus artículos.",
      actionUrl: "/dashboard/configuracion?tab=platform#language",
      actionLabel: "Configurar idioma",
    };
    missingForPublish.push(langItem);
    missingForOpportunities.push(langItem);
  }

  if (!hasImageCredits) {
    const imgCreditItem = {
      id: "image-credits",
      label: "Créditos de imagen agotados",
      description: `Tu cuenta de ${productName} no tiene créditos para generar imágenes con IA.`,
      actionUrl: platformHelpUrl(account.platformDomain) ?? "#",
      actionLabel: "Solicitar créditos de imagen gratuitos",
    };
    missingForPublish.push(imgCreditItem);
    missingForOpportunities.push(imgCreditItem);
  }

  if (!googleConnected || !hasGoogleSiteUrl) {
    const gscItem = {
      id: "google-search-console",
      label: "Google Search Console no conectado",
      description: "Conecta tu propiedad de Google Search Console para analizar oportunidades SEO y tráfico real.",
      actionUrl: "/dashboard/configuracion?tab=integrations#google",
      actionLabel: "Conectar Google Search Console",
    };
    missingForOpportunities.push(gscItem);
  }

  const canPublish =
    credentialsConfigured && hasCategories && hasContentLanguage && hasImageCredits;

  const canRunOpportunities =
    credentialsConfigured &&
    hasCategories &&
    hasContentLanguage &&
    googleConnected &&
    hasGoogleSiteUrl &&
    hasImageCredits;

  return NextResponse.json({
    status: "ok",
    credentialsConfigured,
    hasCategories,
    categoriesCount: categories.length,
    regularCategoriesCount,
    sequenceCategoriesCount,
    hasContentLanguage,
    contentLanguage,
    googleConnected,
    hasGoogleSiteUrl,
    googleSiteUrl,
    hasImageCredits,
    canPublish,
    canRunOpportunities,
    missingForPublish,
    missingForOpportunities,
  });
}
