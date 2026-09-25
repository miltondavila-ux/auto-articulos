import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { platformHelpUrl } from "@auto-articulos/shared";
import { resolveSearchConsoleForUser } from "@/lib/composio-search-console-consumer";

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

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const userId = await getCurrentUserId();
  const account = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true, platformDomain: true } });
  const productName = account.platformDomain === "tagcrush" ? "tu plataforma" : "10minutesWebsite";

  // Parallel queries for performance
  const [
    credential,
    categories,
    user,
    googleIntegration,
    googleAnalyticsIntegration,
    bingIntegration,
    businessProfile,
    threadsIntegration,
    twitterIntegration,
    linkedinIntegration,
    pinterestIntegration,
    tumblrIntegration,
    devToIntegration,
    bloggerIntegration,
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
        role: true,
        clientLocations: true,
        businessLocations: true,
        excludedTopics: true,
        allowPinterestPublishing: true,
        allowTumblrPublishing: true,
        allowDevToPublishing: true,
        allowBloggerPublishing: true,
      },
    }),
    // 4. Google Search Console
    prisma.searchIntegration.findFirst({
      where: { userId, provider: "google", ...(account.selectedSiteDomain ? { siteDomain: account.selectedSiteDomain } : {}) },
      select: { siteUrl: true, sitemapUrl: true },
    }),
    // 5. Google Analytics 4
    prisma.searchIntegration.findFirst({
      where: { userId, provider: "google-analytics", ...(account.selectedSiteDomain ? { siteDomain: account.selectedSiteDomain } : {}) },
      select: { siteUrl: true, encryptedRefreshToken: true },
    }),
    // 6. Bing Webmaster Tools
    prisma.searchIntegration.findFirst({
      where: { userId, provider: "bing", ...(account.selectedSiteDomain ? { siteDomain: account.selectedSiteDomain } : {}) },
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
    prisma.tumblrIntegration.findUnique({
      where: { userId },
      select: { expiresAt: true },
    }),
    prisma.devToIntegration.findUnique({
      where: { userId },
      select: { username: true },
    }),
    prisma.bloggerIntegration.findUnique({
      where: { userId },
      select: { blogName: true },
    }),
  ]);

  const [resolvedSearchConsole, analyticsComposioConnection] = await Promise.all([
    resolveSearchConsoleForUser(userId, account.selectedSiteDomain ?? ""),
    prisma.composioConnection.findFirst({
      where: {
        userId,
        app: "google_analytics",
        status: "ACTIVE",
        ...(account.selectedSiteDomain ? { OR: [{ siteDomain: account.selectedSiteDomain }, { siteDomain: "" }] } : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: { propertyId: true, siteUrl: true },
    }),
  ]);
  const searchConsoleConfigured = Boolean(googleIntegration?.siteUrl) || (
    resolvedSearchConsole.source === "COMPOSIO" && Boolean(resolvedSearchConsole.state.composio?.siteUrl)
  );
  const hasLegacyGoogleAnalytics = Boolean(googleAnalyticsIntegration?.siteUrl && googleAnalyticsIntegration.encryptedRefreshToken);
  const hasActiveComposioAnalytics = Boolean(analyticsComposioConnection?.propertyId || analyticsComposioConnection?.siteUrl);

  const checks: ConfigurationCheck[] = [
    // ━━━ MÍNIMO PARA PUBLICAR ━━━
    {
      id: "credentials",
      label: `Credenciales de ${productName}`,
      configured: Boolean(credential),
      required: true,
      section: "platform",
      description: `Tu usuario y contraseña de ${productName} para publicar artículos automáticamente.`,
      actionUrl: "/dashboard/configuracion?tab=platform#credentials",
      actionLabel: "Configurar credenciales",
    },
    {
      id: "categories",
      label: "Categorías sincronizadas",
      configured: categories.length > 0,
      required: true,
      section: "platform",
      description: `Al menos una categoría sincronizada desde ${productName} para clasificar tus artículos.`,
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
      description: `Disponibilidad de créditos de generación de imágenes con IA en ${productName}.`,
      actionUrl: platformHelpUrl(account.platformDomain) ?? "#",
      actionLabel: "Solicitar créditos de imagen",
    },

    // ━━━ SEO ━━━
    {
      id: "google-search-console",
      label: "Google Search Console",
      configured: searchConsoleConfigured,
      required: false,
      section: "seo",
      description: "Conecta tu sitio a Google Search Console para indexar artículos y enviar sitemaps automáticamente.",
      actionUrl: "/dashboard/configuracion/conexiones?conexion=google-search-console",
      actionLabel: "Conectar Search Console",
    },
    {
      id: "google-analytics",
      label: "Google Analytics",
      configured: Boolean((googleAnalyticsIntegration?.siteUrl && googleAnalyticsIntegration.encryptedRefreshToken) || hasActiveComposioAnalytics),
      required: false,
      section: "seo",
      description: "Conecta Google Analytics para que SEO TOTAL use datos reales de visitas al proponer contenidos.",
      actionUrl: "/dashboard/configuracion/conexiones?conexion=google-analytics",
      actionLabel: "Configurar Google Analytics",
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
      configured: Boolean((user?.role === "admin" || user?.allowPinterestPublishing) && pinterestIntegration && pinterestIntegration.boardId && (!pinterestIntegration.expiresAt || pinterestIntegration.expiresAt > new Date())),
      required: false,
      section: "social",
      description: "Publica automáticamente tus artículos como Pins con imagen y enlace al artículo.",
      actionUrl: "/dashboard/configuracion?tab=social",
      actionLabel: "Conectar Pinterest",
    },
    {
      id: "tumblr",
      label: "Tumblr",
      configured: Boolean((user?.role === "admin" || user?.allowTumblrPublishing) && tumblrIntegration && (!tumblrIntegration.expiresAt || tumblrIntegration.expiresAt > new Date())),
      required: false,
      section: "social",
      description: "Publica automáticamente tus artículos con imagen, texto y enlace en Tumblr.",
      actionUrl: "/dashboard/configuracion?tab=social",
      actionLabel: "Conectar Tumblr",
    },
    {
      id: "devto",
      label: "DEV.to",
      configured: Boolean((user?.role === "admin" || user?.allowDevToPublishing) && devToIntegration),
      required: false,
      section: "social",
      description: "Publica una versión adaptada del artículo con enlace canónico en DEV.to.",
      actionUrl: "/dashboard/configuracion?tab=social",
      actionLabel: "Conectar DEV.to",
    },
    {
      id: "blogger",
      label: "Blogger",
      configured: Boolean((user?.role === "admin" || user?.allowBloggerPublishing) && bloggerIntegration),
      required: false,
      section: "social",
      description: "Publica entradas de tus artículos en el blog de Blogger conectado.",
      actionUrl: "/dashboard/configuracion?tab=social",
      actionLabel: "Conectar Blogger",
    },

    // ━━━ CONTENIDO ━━━
    {
      id: "phone",
      label: "Teléfono de contacto",
      configured: Boolean(user?.phone),
      required: false,
      section: "content",
      description: "Número de teléfono que aparecerá en botones de WhatsApp y llamada en tus artículos.",
      actionUrl: "/dashboard/configuracion/contenido",
      actionLabel: "Agregar teléfono",
    },
    {
      id: "signature",
      label: "Footer / disclosure del artículo",
      configured: Boolean(user?.articleSignature),
      required: false,
      section: "content",
      description: "Texto que se agregará automáticamente al final de cada artículo.",
      actionUrl: "/dashboard/configuracion/contenido",
      actionLabel: "Crear firma",
    },
    {
      id: "excluded-topics",
      label: "Qué no decir en los artículos",
      configured: Boolean(user?.excludedTopics?.trim()),
      required: false,
      section: "content",
      description: "Temas o palabras que la publicación inteligente debe evitar al proponer artículos.",
      actionUrl: "/dashboard/configuracion/contenido",
      actionLabel: "Configurar temas a evitar",
    },
    {
      id: "geolocation",
      label: "Ubicaciones para geolocalización",
      configured: Boolean(user?.clientLocations?.trim() && user?.businessLocations?.trim()),
      required: false,
      section: "content",
      description: "Indica dónde están tus clientes y dónde opera tu negocio para crear títulos más relevantes por ubicación.",
      actionUrl: "/dashboard/configuracion/contenido",
      actionLabel: "Configurar ubicaciones",
    },
  ];

  const hasActiveComposioSearchConsole = Boolean(
    resolvedSearchConsole.state.composio?.status === "ACTIVE" &&
      resolvedSearchConsole.state.composio.hasSelection,
  );

  // Interruptor del aviso rojo de reconexión: apagado por defecto. "all" lo muestra a todos;
  // una lista de IDs separada por comas lo limita a un piloto. Se apaga quitando la variable.
  const reconnectNotice = (process.env.COMPOSIO_RECONNECT_NOTICE ?? "").trim();
  const showReconnectNotice =
    reconnectNotice === "all" ||
    reconnectNotice.split(",").map((id) => id.trim()).filter(Boolean).includes(userId);

  if (!showReconnectNotice) {
    // Aviso apagado: no se agrega ninguna solicitud de reconexión.
  } else if (!hasActiveComposioSearchConsole) {
    checks.push({
      id: "google-search-console-reconnect",
      label: "Reconectar Google Search Console por Composio",
      configured: false,
      required: false,
      section: "seo",
      description: "Debes reconectar Google Search Console mediante Conexiones.",
      actionUrl: "/dashboard/configuracion/conexiones?conexion=google-search-console",
      actionLabel: "Reconectar Search Console",
    });
  } else if (hasLegacyGoogleAnalytics && !hasActiveComposioAnalytics) {
    checks.push({
      id: "google-analytics-reconnect",
      label: "Reconectar Google Analytics por Composio",
      configured: false,
      required: false,
      section: "seo",
      description: "Debes reconectar Google Analytics mediante Conexiones.",
      actionUrl: "/dashboard/configuracion/conexiones?conexion=google-analytics",
      actionLabel: "Reconectar Analytics",
    });
  }

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
