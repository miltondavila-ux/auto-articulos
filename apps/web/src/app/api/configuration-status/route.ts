import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

interface ConfigurationCheck {
  id: string;
  label: string;
  configured: boolean;
  required: boolean;
  section: "platform" | "seo" | "social" | "content";
  description: string;
  actionUrl: string;
  actionLabel: string;
}

export async function GET() {
  const userId = await getCurrentUserId();

  // Parallel queries for performance
  const [
    credential,
    categories,
    user,
    googleIntegration,
    bingIntegration,
    businessProfile,
    threadsIntegration,
    twitterIntegration,
    linkedinIntegration,
    pinterestIntegration,
  ] = await Promise.all([
    // 1. Credenciales 10minutesWebsite
    prisma.credential.findUnique({
      where: { userId_platform: { userId, platform: "10minutesWebsite" } },
      select: { updatedAt: true },
    }),
    // 2. Categorías sincronizadas
    prisma.category.findMany({
      where: { userId, source: { not: "archived" } },
      select: { id: true },
    }),
    // 3. Datos del usuario (idioma, firma, teléfono)
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        contentLanguage: true,
        articleSignature: true,
        phone: true,
        imagePrompt: true,
        hasImageCredits: true,
      },
    }),
    // 4. Google Search Console
    prisma.searchIntegration.findUnique({
      where: { userId_provider: { userId, provider: "google" } },
      select: { siteUrl: true, sitemapUrl: true },
    }),
    // 5. Bing Webmaster Tools
    prisma.searchIntegration.findUnique({
      where: { userId_provider: { userId, provider: "bing" } },
      select: { siteUrl: true, sitemapUrl: true },
    }),
    // 6. Google Business Profile
    prisma.businessProfileIntegration.findUnique({
      where: { userId },
      select: { locationName: true },
    }),
    // 7. Meta Threads
    prisma.threadsIntegration.findUnique({
      where: { userId },
      select: { expiresAt: true },
    }),
    // 8. X/Twitter
    prisma.twitterIntegration.findUnique({
      where: { userId },
      select: { expiresAt: true },
    }),
    // 9. LinkedIn
    prisma.linkedInIntegration.findUnique({
      where: { userId },
      select: { expiresAt: true },
    }),
    prisma.pinterestIntegration.findUnique({
      where: { userId },
      select: { expiresAt: true, boardId: true },
    }),
  ]);

  const checks: ConfigurationCheck[] = [
    // ━━━ MÍNIMO PARA PUBLICAR ━━━
    {
      id: "credentials",
      label: "Credenciales de 10minutesWebsite",
      configured: Boolean(credential),
      required: true,
      section: "platform",
      description: "Tu usuario y contraseña de 10minutesWebsite para publicar artículos automáticamente.",
      actionUrl: "/dashboard/configuracion?tab=platform#credentials",
      actionLabel: "Configurar credenciales",
    },
    {
      id: "categories",
      label: "Categorías sincronizadas",
      configured: categories.length > 0,
      required: true,
      section: "platform",
      description: "Al menos una categoría sincronizada desde 10minutesWebsite para clasificar tus artículos.",
      actionUrl: "/dashboard/configuracion?tab=platform#categories",
      actionLabel: "Sincronizar categorías",
    },
    {
      id: "language",
      label: "Idioma de redacción",
      configured: Boolean(user?.contentLanguage),
      required: true,
      section: "platform",
      description: "El idioma en que la IA redactará tus artículos (español, inglés, etc.).",
      actionUrl: "/dashboard/configuracion?tab=platform#language",
      actionLabel: "Seleccionar idioma",
    },
    {
      id: "image-credits",
      label: "Créditos de imagen",
      configured: Boolean(user?.hasImageCredits ?? true),
      required: true,
      section: "platform",
      description: "Disponibilidad de créditos de generación de imágenes con IA en 10minutesWebsite.",
      actionUrl: "https://www.10minuteswebsite.com/ayuda",
      actionLabel: "Solicitar créditos de imagen",
    },

    // ━━━ SEO ━━━
    {
      id: "google-search-console",
      label: "Google Search Console",
      configured: Boolean(googleIntegration?.siteUrl),
      required: false,
      section: "seo",
      description: "Conecta tu sitio a Google Search Console para indexar artículos y enviar sitemaps automáticamente.",
      actionUrl: "/dashboard/configuracion?tab=integrations#google",
      actionLabel: "Conectar Google",
    },
    {
      id: "bing-webmaster",
      label: "Bing Webmaster Tools",
      configured: Boolean(bingIntegration?.siteUrl),
      required: false,
      section: "seo",
      description: "Conecta tu sitio a Bing Webmaster Tools para indexar artículos en Bing automáticamente.",
      actionUrl: "/dashboard/configuracion?tab=integrations#bing",
      actionLabel: "Conectar Bing",
    },

    // ━━━ REDES SOCIALES ━━━
    {
      id: "business-profile",
      label: "Google Business Profile",
      configured: Boolean(businessProfile?.locationName),
      required: false,
      section: "social",
      description: "Publica automáticamente tus artículos como posts en tu perfil de negocio de Google.",
      actionUrl: "/dashboard/configuracion?tab=social",
      actionLabel: "Conectar Business Profile",
    },
    {
      id: "threads",
      label: "Meta Threads",
      configured: Boolean(threadsIntegration && threadsIntegration.expiresAt > new Date()),
      required: false,
      section: "social",
      description: "Publica automáticamente hilos en Threads con tus artículos.",
      actionUrl: "/dashboard/configuracion?tab=social",
      actionLabel: "Conectar Threads",
    },
    {
      id: "twitter",
      label: "X / Twitter",
      configured: Boolean(twitterIntegration && twitterIntegration.expiresAt > new Date()),
      required: false,
      section: "social",
      description: "Publica automáticamente tweets con tus artículos.",
      actionUrl: "/dashboard/configuracion?tab=social",
      actionLabel: "Conectar X/Twitter",
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      configured: Boolean(linkedinIntegration && linkedinIntegration.expiresAt > new Date()),
      required: false,
      section: "social",
      description: "Publica automáticamente artículos en tu perfil o página de LinkedIn.",
      actionUrl: "/dashboard/configuracion?tab=social",
      actionLabel: "Conectar LinkedIn",
    },
    {
      id: "pinterest",
      label: "Pinterest",
      configured: Boolean(pinterestIntegration && pinterestIntegration.boardId && (!pinterestIntegration.expiresAt || pinterestIntegration.expiresAt > new Date())),
      required: false,
      section: "social",
      description: "Publica automáticamente tus artículos como Pins con imagen y enlace al artículo.",
      actionUrl: "/dashboard/configuracion?tab=social",
      actionLabel: "Conectar Pinterest",
    },

    // ━━━ CONTENIDO ━━━
    {
      id: "phone",
      label: "Teléfono de contacto",
      configured: Boolean(user?.phone),
      required: false,
      section: "content",
      description: "Número de teléfono que aparecerá en botones de WhatsApp y llamada en tus artículos.",
      actionUrl: "/dashboard/configuracion?tab=platform",
      actionLabel: "Agregar teléfono",
    },
    {
      id: "signature",
      label: "Firma del artículo",
      configured: Boolean(user?.articleSignature),
      required: false,
      section: "content",
      description: "Texto que se agregará automáticamente al final de cada artículo.",
      actionUrl: "/dashboard/configuracion?tab=platform",
      actionLabel: "Crear firma",
    },
  ];

  const requiredTotal = checks.filter((c) => c.required).length;
  const requiredConfigured = checks.filter((c) => c.required && c.configured).length;
  const totalConfigured = checks.filter((c) => c.configured).length;
  const isFullyConfigured = requiredConfigured === requiredTotal;

  return NextResponse.json({
    checks,
    summary: {
      requiredTotal,
      requiredConfigured,
      totalChecks: checks.length,
      totalConfigured,
      isFullyConfigured,
      percentage: Math.round((totalConfigured / checks.length) * 100),
    },
  });
}
