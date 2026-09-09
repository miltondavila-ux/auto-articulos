import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { canUseSocialModule } from "@/lib/social-access";
import { triggerSocialWorkerNow } from "@/lib/trigger-worker";
import {
  decryptSecret,
  encryptSecret,
  getGoogleAccessToken,
  queryGoogleSearchAnalytics,
  refreshTumblrToken,
} from "@auto-articulos/shared";
import { getGoogleAnalyticsSignals, summarizeGoogleAnalyticsSignals } from "@/lib/google-analytics-signals";
import { getBingSignals } from "@/lib/bing-signals";
import { getStoredTumblrAppCredentials } from "@/lib/tumblr-app-config";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

type ArticleCandidate = {
  id: string;
  finalTitle: string | null;
  text: string;
  summary: string | null;
  articleUrl: string | null;
  searchQueries?: string[];
};

const formulas = [
  `Fórmula: Historia personal / Anécdota cercana.
   Pautas: Empieza contando una pequeña anécdota en primera persona como si le hablaras a un amigo (Ej: "Ayer conversaba con una cliente...", "Estaba revisando unos casos de..."). Relata la lección y dile que escribiste un post rápido en tu blog para ayudarlos en esa situación.`,
  `Fórmula: Curiosidad y Secreto.
   Pautas: Comienza con una frase de impacto que rompa el scroll (Ej: "Hay una cosa sobre... de la que casi nadie habla y es clave...", "Si estás en Florida, hay un detalle con... que te puede ahorrar dolores de cabeza"). Cierra diciendo que escribiste una guía completa en tu blog.`,
  `Fórmula: Empatía directa con el dolor del cliente.
   Pautas: Empieza con una pregunta directa sobre una frustración común (Ej: "¿Te ha pasado que sientes que el sistema de... está hecho para confundirte?", "¿Por qué nos complican tanto la vida con...?"). Ofréceles la solución que acabas de subir al blog.`,
  `Fórmula: 3 puntos de valor informales.
   Pautas: Escribe una introducción súper corta y directa, y luego enumera 2 o 3 tips rápidos y sencillos. Cierra invitándolos a leer la explicación completa en tu sitio.`,
  `Fórmula: Hot Take / Desmitificación.
   Pautas: Comienza cuestionando una idea o mito común de forma amigable (Ej: "Nos han hecho creer que conseguir un... es un dolor de cabeza, pero es más fácil de lo que piensas..."). Ofrece tu post como la explicación clara.`
];

async function generateGPTCopy(
  platform: string,
  finalTitle: string,
  summary: string,
  searchQueries: string[] = [],
  googleAnalyticsContext?: string,
): Promise<string> {
  // "instagram-story" NO tiene caption visible en Instagram (publishInstagramStory
  // no manda texto, solo la imagen) — este texto queda solo de registro interno,
  // por eso sigue el estilo corto genérico. Post/Reel-image/Carousel/Infografía sí
  // muestran el caption debajo de la imagen y merecen su propio estilo — pedido
  // explícito de Milton (20/8/2026), antes usaban el mismo molde casual de Threads.
  // Instagram tampoco vuelve clicable ninguna URL en el caption: usan hashtags,
  // no enlace — otro pedido explícito de Milton.
  const isInstagramFeedCaption =
    platform === "instagram-post" ||
    platform === "instagram-reel-image" ||
    platform === "instagram-carousel" ||
    platform === "instagram-infografia";
  const fallbackText = isInstagramFeedCaption
    ? `${finalTitle}\n\n${summary}`
    : `${finalTitle}\n\n${summary}\n\nLeer más: [ENLACE]`;
  if (!OPENAI_API_KEY) {
    return fallbackText;
  }
  const selectedFormula = formulas[Math.floor(Math.random() * formulas.length)];
  // LinkedIn permite hasta 3000 caracteres y funciona mejor con posts más
  // elaborados; Threads/X son de formato corto (límites reales 500/280).
  const isLinkedIn = platform === "linkedin";
  const isFacebookPage = platform === "facebook-page";
  const isPinterest = platform === "pinterest";
  const isBlogger = platform === "blogger";
  const charLimit = isLinkedIn ? 1300 : isFacebookPage ? 700 : isInstagramFeedCaption ? 1000 : isPinterest ? 800 : isBlogger ? 1600 : 360;
  const maxTokens = isLinkedIn ? 700 : isFacebookPage ? 450 : isInstagramFeedCaption ? 550 : isPinterest ? 500 : isBlogger ? 800 : 300;
  const styleNote = isLinkedIn
    ? "Tono profesional pero cercano (LinkedIn), con más contexto y valor. Puedes usar párrafos cortos separados por saltos de línea."
    : isBlogger
    ? "Blogger: escribe un resumen editorial original de 2 a 4 párrafos cortos (separados por saltos de línea dobles) que invite a leer el artículo completo — no es el artículo entero, es un adelanto con valor propio, como una nota de blog independiente."
    : isFacebookPage
    ? "Facebook Page: tono cálido, humano y conversacional; reconoce el problema de la persona, explica el beneficio con claridad y cierra con una invitación cercana. Debe sentirse como una recomendación útil, no como un anuncio."
    : isInstagramFeedCaption
    ? "Caption real de Instagram: la primera línea es lo único visible antes del \"más\" (unos 125 caracteres), así que debe ser un gancho que detenga el scroll por sí solo. Después, párrafos cortos con saltos de línea entre cada uno (no un bloque de texto). Cierra con una invitación clara a leer el artículo."
    : isPinterest
    ? "Pinterest: tono claro, útil, cercano y orientado a búsqueda; conecta el contenido con una necesidad concreta, usa palabras clave naturales y transmite confianza sin sonar promocional."
    : platform === "threads"
    ? "Threads: tono espontáneo, empático y conversacional; escribe como una reflexión breve dirigida a personas reales, con una observación útil y una invitación natural a profundizar."
    : platform === "x"
    ? "X: tono directo, claro y humano; presenta una idea fuerte o una pregunta que refleje una preocupación real, aporta valor rápidamente y evita exageraciones."
    : platform === "bluesky"
    ? "Bluesky: tono auténtico, cercano y reflexivo; prioriza una conversación honesta con la comunidad, empatía y utilidad por encima de la promoción."
    : "Tono cercano, empático y directo, como hablarle con respeto y calidez a una persona que necesita ayuda.";
  const searchContext = searchQueries.length > 0
    ? `- Consultas reales que están llevando usuarios a este artículo: ${searchQueries.join(" | ")}\n`
    : "";
  const analyticsContext = googleAnalyticsContext
    ? `- Señales agregadas de Google Analytics 4 (solo como contexto): ${googleAnalyticsContext}\n`
    : "";
  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content:
              `Eres Lorena Alvarez, una asesora de seguros en Florida súper cercana, alegre, empática y de gran confianza. ` +
              `Escribe una publicación optimizada para la red social ${platform}. Debe sonar 100% natural, en primera persona del singular ("yo", "mi", "me"). ${styleNote}\n\n` +
              `INSTRUCCIONES DE ESTILO ESPECÍFICAS:\n` +
              `${selectedFormula}\n\n` +
              `REGLAS CRÍTICAS:\n` +
              `- El texto debe ser menor a ${charLimit} caracteres.\n` +
              `- Habla desde la necesidad real del lector: demuestra que entiendes su preocupación antes de presentar la información.\n` +
              `- Sé empática, cercana y humana; conecta con la persona sin dramatizar, manipular ni prometer resultados.\n` +
              `- Refuerza autoridad mediante claridad, experiencia y utilidad concreta, nunca mediante frases grandilocuentes.\n` +
              `- Usa un ángulo editorial propio para esta red: desarrolla una pregunta, problema, consejo, comparación, error, caso o tendencia relacionada con el tema central del artículo. No repitas simplemente el título ni copies el mismo enfoque de otra red.\n` +
              `- La relación temática debe ampliar el universo del artículo: puedes conectar con subtemas complementarios y necesidades derivadas del lector, pero no inventes hechos ni te alejes del tema respaldado por el título, resumen o consultas reales.\n` +
              `- No uses frases vacías, tono frío, lenguaje corporativo ni expresiones que parezcan generadas automáticamente.\n` +
              (isInstagramFeedCaption
                ? `- Instagram no muestra enlaces clicables en el caption — NUNCA escribas una URL ni la palabra "[ENLACE]". En vez de eso, termina con al menos 5 hashtags reales, en español, sacados de palabras clave del tema y contenido del artículo (no genéricos como #instagram) — sin espacios dentro de cada hashtag, separados entre sí por un espacio, en su propia línea al final.\n\n`
                : `- No uses hashtags (#) ni formato markdown.\n` +
                  `- NO escribas la URL del artículo directamente. Escribe la palabra exacta "[ENLACE]" (en mayúsculas y con corchetes) al final, integrada en tu frase de cierre (Ej: "Te lo explico con peras y manzanas aquí: [ENLACE]").\n\n`) +
              `Datos:\n` +
              `- Título del artículo: ${finalTitle}\n` +
              `- Resumen: ${summary}\n` +
              searchContext + analyticsContext +
              `- Usa las consultas reales solo como contexto: no las enumeres, no inventes datos y mantén un tono natural.`,
          },
        ],
        temperature: 0.85,
        max_tokens: maxTokens,
      }),
    });
    const data = (await response.json()) as any;
    return data.choices?.[0]?.message?.content?.trim() ?? fallbackText;
  } catch {
    return fallbackText;
  }
}

function tokenizeForMatch(value: string): Set<string> {
  return new Set(
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((token) => token.length > 3),
  );
}

function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
}

/**
 * Selecciona artículos YA PUBLICADOS priorizando los que están puntuando
 * fuerte AHORA en Google Search Console, Google Analytics 4 y Bing Webmaster
 * Tools — pedido explícito de Milton (7/9/2026): que redes/microblogging
 * elija de qué artículo hablar según la misma "bola de nieve" de tendencias
 * reales que ya usa el algoritmo de Oportunidades SEO, no por orden de
 * llegada de Google ni por fecha de publicación. NO crea artículos nuevos ni
 * descubre temas sin artículo — decisión explícita de Milton: solo prioriza
 * entre lo que ya existe.
 */
async function selectTrendingArticles(userId: string): Promise<ArticleCandidate[]> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true } });
  const gsc = await prisma.searchIntegration.findFirst({ where: { userId, provider: "google", ...(user.selectedSiteDomain ? { siteDomain: user.selectedSiteDomain } : {}) } });

  // Una sola clave por página en todo este cálculo: el PATHNAME normalizado
  // (ej. "/noticias/algo"), nunca la URL completa ni el pagePath de GA4 por
  // separado — GSC entrega URL completa, GA4 entrega solo el path, y sin
  // normalizar ambos a la misma forma desde el inicio sus puntajes quedaban
  // en dos entradas distintas del mapa y nunca se sumaban entre sí.
  const scoreByPath = new Map<string, number>();
  const queriesByPath = new Map<string, string[]>();
  const addScore = (path: string, amount: number) => {
    scoreByPath.set(path, (scoreByPath.get(path) ?? 0) + amount);
  };

  // 1) Google Search Console: impresiones/clics actuales + tendencia (mismo
  // patrón de ventana que el algoritmo de Oportunidades: 27 días actuales
  // vs 27 previos), agregado por página, con las consultas reales que la
  // alimentan (esto también activa `searchQueries`, que existía en el tipo
  // pero nunca se llenaba — el copy nunca mencionaba la consulta real).
  if (gsc?.siteUrl && gsc.encryptedRefreshToken) {
    try {
      const accessToken = await getGoogleAccessToken(decryptSecret(gsc.encryptedRefreshToken));
      const end = new Date();
      end.setUTCDate(end.getUTCDate() - 3);
      const currentStart = new Date(end);
      currentStart.setUTCDate(currentStart.getUTCDate() - 27);
      const previousEnd = new Date(currentStart);
      previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
      const previousStart = new Date(previousEnd);
      previousStart.setUTCDate(previousStart.getUTCDate() - 27);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);

      const [currentRows, previousRows] = await Promise.all([
        queryGoogleSearchAnalytics(accessToken, gsc.siteUrl, fmt(currentStart), fmt(end), ["page", "query"]),
        queryGoogleSearchAnalytics(accessToken, gsc.siteUrl, fmt(previousStart), fmt(previousEnd), ["page"]),
      ]);

      const previousImpressionsByPath = new Map<string, number>();
      for (const row of previousRows) {
        const path = pathnameOf(row.keys[0]);
        previousImpressionsByPath.set(path, (previousImpressionsByPath.get(path) ?? 0) + row.impressions);
      }

      const queryTotalsByPath = new Map<string, Map<string, number>>();
      const currentImpressionsByPath = new Map<string, number>();
      for (const row of currentRows) {
        const path = pathnameOf(row.keys[0]);
        const query = row.keys[1] ?? "";
        currentImpressionsByPath.set(path, (currentImpressionsByPath.get(path) ?? 0) + row.impressions);
        // Puntaje: impresiones + peso fuerte a clics reales.
        addScore(path, row.impressions + row.clicks * 8);

        if (query) {
          const perQuery = queryTotalsByPath.get(path) ?? new Map<string, number>();
          perQuery.set(query, (perQuery.get(query) ?? 0) + row.impressions);
          queryTotalsByPath.set(path, perQuery);
        }
      }
      // Bonus por tendencia creciente frente al periodo previo (una sola vez
      // por página, no por fila, a diferencia del bloque de arriba).
      for (const [path, currentImpressions] of currentImpressionsByPath) {
        const previousImpressions = previousImpressionsByPath.get(path) ?? 0;
        addScore(path, Math.max(0, currentImpressions - previousImpressions) * 2);
      }

      for (const [path, perQuery] of queryTotalsByPath) {
        const topQueries = [...perQuery.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([query]) => query);
        queriesByPath.set(path, topQueries);
      }
    } catch {
      // GSC opcional para este ranking: si falla, el resto de señales o el
      // fallback de recencia siguen funcionando.
    }
  }

  // 2) Google Analytics 4: sesiones/usuarios activos reales por página —
  // mismo patrón ya usado en el algoritmo de Oportunidades SEO.
  try {
    const ga4 = await getGoogleAnalyticsSignals(userId);
    for (const row of ga4.rows) {
      if (!row.pagePath) continue;
      addScore(pathnameOf(row.pagePath), row.sessions * 3 + row.activeUsers * 2);
    }
  } catch {
    // opcional, igual que en el resto del sistema.
  }

  // 3) Bing Webmaster Tools: no expone página por consulta, solo consultas a
  // nivel de sitio — se usa como una señal adicional de qué tema tiene
  // volumen real ahora mismo, sumando su impacto a cualquier página cuyas
  // consultas reales de GSC compartan palabras clave con la consulta de Bing
  // (mismo criterio de coincidencia por tokens que ya usa el algoritmo SEO).
  try {
    const bing = await getBingSignals(userId);
    if (bing.rows.length > 0) {
      const topBingQueries = bing.rows.slice(0, 50);
      for (const [path, queries] of queriesByPath) {
        const pathTokens = new Set(queries.flatMap((q) => [...tokenizeForMatch(q)]));
        let bingBoost = 0;
        for (const bingRow of topBingQueries) {
          const bingTokens = tokenizeForMatch(bingRow.query);
          const shared = [...bingTokens].filter((t) => pathTokens.has(t)).length;
          if (shared >= 2) bingBoost += bingRow.impressions;
        }
        if (bingBoost > 0) addScore(path, bingBoost);
      }
    }
  } catch {
    // opcional.
  }

  const articles = await prisma.title.findMany({
    where: { run: { userId }, status: "success", articleUrl: { not: null } },
    orderBy: { processedAt: "desc" },
    select: { id: true, finalTitle: true, text: true, summary: true, articleUrl: true, processedAt: true },
  });

  const ranked = articles
    .map((article) => ({
      article,
      trendScore: scoreByPath.get(pathnameOf(article.articleUrl!)) ?? 0,
    }))
    .sort((a, b) => {
      // Lo que tiene señal real de tendencia va primero (mayor puntaje);
      // sin ninguna señal (score 0 en ambos), se conserva el orden por
      // fecha de publicación más reciente (comportamiento previo intacto
      // para cuentas sin datos suficientes todavía).
      if (a.trendScore !== b.trendScore) return b.trendScore - a.trendScore;
      return (b.article.processedAt?.getTime() ?? 0) - (a.article.processedAt?.getTime() ?? 0);
    });

  return ranked.map(({ article }): ArticleCandidate => ({
    id: article.id,
    finalTitle: article.finalTitle,
    text: article.text,
    summary: article.summary,
    articleUrl: article.articleUrl,
    searchQueries: queriesByPath.get(pathnameOf(article.articleUrl!)) ?? [],
  }));
}

/**
 * Renueva en silencio el access token de Tumblr con el refresh token cuando
 * ya venció, igual que ya hacen la pantalla de Configuración y el worker al
 * publicar. Sin esto, el botón "Tumblr" desaparecía de Oportunidades cada
 * vez que nadie había visitado Configuración recientemente, aunque el
 * refresh token siguiera siendo válido — pedido explícito de Milton
 * (4/9/2026) tras tener que reconectar Tumblr por OAuth completo a mano.
 */
async function getFreshTumblrExpiry(
  tumblr: { expiresAt: Date | null; refreshTokenEncrypted: string | null } | null,
  userId: string,
): Promise<Date | null> {
  if (!tumblr) return null;
  if (!tumblr.expiresAt || tumblr.expiresAt > new Date()) return tumblr.expiresAt;
  if (!tumblr.refreshTokenEncrypted) return tumblr.expiresAt;
  try {
    const credentials = await getStoredTumblrAppCredentials();
    const refreshed = await refreshTumblrToken(decryptSecret(tumblr.refreshTokenEncrypted), credentials);
    const expiresAt = refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null;
    await prisma.tumblrIntegration.update({
      where: { userId },
      data: {
        accessTokenEncrypted: encryptSecret(refreshed.access_token),
        refreshTokenEncrypted: refreshed.refresh_token ? encryptSecret(refreshed.refresh_token) : undefined,
        expiresAt,
      },
    });
    return expiresAt;
  } catch {
    // Igual que en la pantalla de Configuración: si Tumblr también rechaza
    // la renovación silenciosa, se conserva el estado vencido y el botón
    // sigue oculto hasta que Milton reconecte por OAuth.
    return tumblr.expiresAt;
  }
}

async function getConnectedNetworks(userId: string) {
  const [threads, twitter, linkedin, instagram, facebookPage, pinterest, tumblr, bluesky, devto, blogger, user] = await Promise.all([
    prisma.threadsIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.twitterIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.linkedInIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.instagramIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.facebookPageIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.pinterestIntegration.findUnique({ where: { userId }, select: { id: true, boardId: true, expiresAt: true } }),
    prisma.tumblrIntegration.findUnique({ where: { userId }, select: { id: true, expiresAt: true, refreshTokenEncrypted: true } }),
    prisma.blueskyIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.devToIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.bloggerIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true, allowInstagramPublishing: true, allowLinkedInPublishing: true, allowThreadsPublishing: true, allowFacebookPublishing: true, allowPinterestPublishing: true, allowTumblrPublishing: true, allowBlueskyPublishing: true, allowDevToPublishing: true, allowBloggerPublishing: true } }),
  ]);
  const tumblrExpiresAt = await getFreshTumblrExpiry(tumblr, userId);
  const isAdmin = user?.role === "admin";
  const socialOverride = user?.email?.toLowerCase() === "lorenalvarez30@gmail.com";
  // X (Twitter) apagada a pedido explícito de Milton (30/8/2026): "no la
  // usaremos, salvo que la volvamos a solicitar". Se deja el resto del
  // código de X intacto (integración, publicación, historial) para poder
  // reactivarla fácil más adelante — solo se fuerza a `false` acá, el único
  // punto de donde sale si se muestra o no en Oportunidades en Redes.
  const activeNetworks = { threads: Boolean(isAdmin || socialOverride || user?.allowThreadsPublishing), x: false, linkedin: Boolean(isAdmin || socialOverride || user?.allowLinkedInPublishing), instagram: Boolean(isAdmin || socialOverride || user?.allowInstagramPublishing), facebookPage: Boolean(isAdmin || socialOverride || user?.allowFacebookPublishing), pinterest: Boolean(isAdmin || socialOverride || user?.allowPinterestPublishing), tumblr: Boolean(isAdmin || socialOverride || user?.allowTumblrPublishing), bluesky: Boolean(isAdmin || user?.allowBlueskyPublishing), devto: Boolean(isAdmin || socialOverride || user?.allowDevToPublishing), blogger: Boolean(isAdmin || socialOverride || user?.allowBloggerPublishing) };
  return { activeNetworks, threads: activeNetworks.threads && Boolean(threads), x: activeNetworks.x && Boolean(twitter), linkedin: activeNetworks.linkedin && Boolean(linkedin), instagram: activeNetworks.instagram && Boolean(instagram), facebookPage: activeNetworks.facebookPage && Boolean(facebookPage), pinterest: activeNetworks.pinterest && Boolean(pinterest && pinterest.boardId && (!pinterest.expiresAt || pinterest.expiresAt > new Date())), tumblr: activeNetworks.tumblr && Boolean(tumblr && (!tumblrExpiresAt || tumblrExpiresAt > new Date())), bluesky: activeNetworks.bluesky && Boolean(bluesky), devto: activeNetworks.devto && Boolean(devto), blogger: activeNetworks.blogger && Boolean(blogger) };
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!(await canUseSocialModule(userId))) return NextResponse.json({ error: "Módulo reservado a administradores y Lorena." }, { status: 403 });
    return NextResponse.json(await getConnectedNetworks(userId));
  } catch {
    return NextResponse.json({ error: "Error al consultar redes conectadas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!(await canUseSocialModule(userId))) return NextResponse.json({ error: "Módulo reservado a administradores y Lorena." }, { status: 403 });
    const body = await request.json().catch(() => ({})) as { networks?: string[] };
    const connected = await getConnectedNetworks(userId);
    const requestedNetworks = Array.isArray(body.networks)
      ? body.networks.filter((network) => network === "threads" || network === "x" || network === "linkedin" || network === "instagram" || network === "facebook-page" || network === "pinterest" || network === "tumblr" || network === "bluesky" || network === "devto" || network === "blogger")
      : ["threads", "x", "linkedin", "instagram", "facebook-page", "pinterest", "tumblr", "bluesky", "devto", "blogger"];

    const integrations: string[] = [];
    if (requestedNetworks.includes("threads") && connected.threads) {
      integrations.push("threads");
    }
    if (requestedNetworks.includes("x") && connected.x) {
      integrations.push("x");
    }
    if (requestedNetworks.includes("linkedin") && connected.linkedin) {
      integrations.push("linkedin");
    }
    if (requestedNetworks.includes("facebook-page") && connected.facebookPage) {
      integrations.push("facebook-page");
      integrations.push("facebook-story");
    }
    if (requestedNetworks.includes("pinterest") && connected.pinterest) {
      integrations.push("pinterest");
    }
    if (requestedNetworks.includes("tumblr") && connected.tumblr) {
      integrations.push("tumblr");
    }
    if (requestedNetworks.includes("bluesky") && connected.bluesky) {
      integrations.push("bluesky");
    }
    if (requestedNetworks.includes("devto") && connected.devto) {
      integrations.push("devto");
    }
    if (requestedNetworks.includes("blogger") && connected.blogger) {
      integrations.push("blogger");
    }
    if (requestedNetworks.includes("instagram") && connected.instagram) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { allowInstagramPublishing: true },
      });
      if (user?.allowInstagramPublishing) {
        integrations.push("instagram-story");
        integrations.push("instagram-post");
      }
    }

    if (integrations.length === 0) {
      console.warn("[social-opportunities/generate] red solicitada sin conexión efectiva", {
        requestedNetworks,
        connected,
        userId,
      });
      return NextResponse.json(
        { error: `La red seleccionada (${requestedNetworks.join(", ") || "desconocida"}) no está conectada en tu configuración. Recarga la página y vuelve a intentarlo; si sigue apareciendo, revisa la tarjeta de esa red en Configuración.` },
        { status: 400 }
      );
    }

    const trendingCandidates = await selectTrendingArticles(userId);
    const candidateMap = new Map<string, ArticleCandidate>();
    for (const article of trendingCandidates) {
      candidateMap.set(article.id, article);
    }
    // Dedupe también por URL real, no solo por id de artículo — pedido
    // explícito de Milton (20/8/2026), tras confirmar el mismo artículo
    // publicado varias veces en Threads/Facebook/LinkedIn. Si existen dos
    // registros de Title distintos apuntando a la misma articleUrl (título
    // duplicado), antes se trataban como dos artículos "distintos" y cada
    // uno recibía su propia oportunidad — mismo enlace, misma imagen OG,
    // texto diferente. Ahora solo sobrevive un candidato por URL real.
    const seenUrls = new Set<string>();
    const allCandidates = Array.from(candidateMap.values()).filter((article) => {
      if (!article.articleUrl) return true;
      if (seenUrls.has(article.articleUrl)) return false;
      seenUrls.add(article.articleUrl);
      return true;
    });

    // El historial completo evita que una oportunidad ya publicada,
    // descartada o fallida vuelva a aparecer. Cada formato de Instagram
    // (story/post/reel-image/carousel/infografia) cuenta como su propio
    // canal — pedido explícito de Milton (20/8/2026): antes se colapsaban
    // todos como un único "instagram", así que un artículo que ya tenía una
    // Story nunca podía ofrecerse también como Post. Ahora es igual que
    // LinkedIn/Threads/Facebook: cada plataforma se rastrea por separado.
    const previousOpportunities = await prisma.socialOpportunity.findMany({
      where: {
        userId,
        // "skipped" (botón Descartar) no debe bloquear el artículo para
        // siempre — descartar una idea significa "no esta, dame otra
        // después", no "este artículo ya no puede tener oportunidades
        // nunca más". Reportado por Milton (21/8/2026): tras descartar 52
        // propuestas en lote para "empezar de cero", seguía sin poder
        // generar nuevas porque estas igual contaban como "ya usado".
        status: { not: "skipped" },
        OR: [
          { titleId: { in: allCandidates.map((article) => article.id) } },
          { articleUrl: { in: allCandidates.map((article) => article.articleUrl).filter((url): url is string => Boolean(url)) } },
        ],
      },
      select: { titleId: true, articleUrl: true, platform: true },
    });
    const candidateByUrl = new Map(allCandidates.filter((article) => article.articleUrl).map((article) => [article.articleUrl!, article]));
    const normalizePlatform = (platform: string) => platform;
    const activeKeys = new Set<string>();
    for (const opportunity of previousOpportunities) {
      const platform = normalizePlatform(opportunity.platform);
      if (opportunity.titleId) activeKeys.add(`${opportunity.titleId}:${platform}`);
      const article = candidateByUrl.get(opportunity.articleUrl);
      if (article) activeKeys.add(`${article.id}:${platform}`);
    }

    // Coherencia entre redes, sin repetir el mismo tema el mismo día — pedido
    // explícito de Milton (7/9/2026): que el mensaje varíe entre redes en
    // vez de mandar siempre el mismo artículo top-1 a todas. Cada red se
    // genera con su propio clic ("Crear oportunidad" por red), así que sin
    // esto, pedir Threads y después LinkedIn el mismo día terminaba
    // recogiendo el mismo artículo top-1 para ambas — nada lo impedía antes.
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todaysOpportunities = await prisma.socialOpportunity.findMany({
      where: { userId, status: { not: "skipped" }, createdAt: { gte: todayStart } },
      select: { titleId: true, articleUrl: true },
    });
    const usedTodayIds = new Set(todaysOpportunities.map((o) => o.titleId).filter((id): id is string => Boolean(id)));
    const usedTodayUrls = new Set(todaysOpportunities.map((o) => o.articleUrl).filter(Boolean));
    const wasUsedToday = (article: ArticleCandidate) =>
      usedTodayIds.has(article.id) || (article.articleUrl ? usedTodayUrls.has(article.articleUrl) : false);

    const normalizedIntegrations = integrations.map(normalizePlatform);
    const availableNow = allCandidates.filter((article) =>
      normalizedIntegrations.some((platform) => !activeKeys.has(`${article.id}:${platform}`)),
    );
    // Preferí artículos que hoy todavía no se usaron en NINGUNA otra red; si
    // de verdad no quedan suficientes (cuenta con pocos artículos o mucho volumen
    // ya generado hoy), cae de vuelta al disponible con más tendencia en vez
    // de bloquear al usuario por completo.
    const freshToday = availableNow.filter((article) => !wasUsedToday(article));
    // Hasta 3 candidatos por clic para dar más opciones sin saturar de pendientes.
    const candidates = (freshToday.length > 0 ? freshToday : availableNow).slice(0, 3);

    if (candidates.length === 0) {
      // El mensaje viejo ("no hay artículos nuevos disponibles") sonaba a
      // que no había nada para publicar, cuando en realidad puede haber
      // decenas de propuestas pendientes sin publicar todavía — el sistema
      // solo evita generar MÁS mientras esas no se resuelvan. Milton lo
      // reportó como confuso (21/8/2026): aclarar con el número real.
      const pendingCount = await prisma.socialOpportunity.count({
        where: { userId, status: "pending" },
      });
      return NextResponse.json(
        {
          error:
            pendingCount > 0
              ? `Ya tenés ${pendingCount} propuesta${pendingCount === 1 ? "" : "s"} pendiente${pendingCount === 1 ? "" : "s"} sin publicar — no se generan más hasta que se publiquen o se descarten. Revisá la lista de "Propuestas Pendientes" más abajo.`
              : "No hay artículos nuevos disponibles. Todos los artículos publicados ya tienen una oportunidad generada.",
        },
        { status: 400 }
      );
    }

    const createdOpportunities: any[] = [];
    const googleAnalyticsContext = JSON.stringify(summarizeGoogleAnalyticsSignals(await getGoogleAnalyticsSignals(userId)));

    for (const article of candidates) {
      for (const platform of integrations) {
        const opportunityKey = `${article.id}:${normalizePlatform(platform)}`;
        if (activeKeys.has(opportunityKey)) continue;

        const copyText = await generateGPTCopy(
          platform,
          article.finalTitle || article.text,
          article.summary || "",
          article.searchQueries,
          googleAnalyticsContext,
        );

        const opp = await prisma.socialOpportunity.create({
          data: {
            userId,
            titleId: article.id,
            articleTitle: article.finalTitle || article.text,
            articleUrl: article.articleUrl || "",
            platform,
            suggestedText: copyText,
            status: "pending",
          },
        });

        // La imagen la genera el worker (processNextOpportunityImage) en
        // background para no agotar el timeout de Vercel Functions con la
        // llamada a DALL-E. El usuario la ve aparecer automáticamente.

        createdOpportunities.push(opp);
        activeKeys.add(opportunityKey);
      }
    }

    const account = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true } });
    const source = await prisma.searchIntegration.findFirst({ where: { userId, provider: "google", ...(account.selectedSiteDomain ? { siteDomain: account.selectedSiteDomain } : {}) } });

    if (createdOpportunities.length === 0) {
      return NextResponse.json(
        { error: "Los artículos encontrados ya tienen propuestas para todas las redes y formatos conectados." },
        { status: 400 },
      );
    }

    // Disparar al worker para que genere las imágenes en background y la UI
    // se actualice automáticamente al refrescar. No esperamos la respuesta
    // para no bloquear el handler de Vercel.
    if (createdOpportunities.length > 0) {
      void triggerSocialWorkerNow().catch((err) => {
        console.error("[social-opportunities/generate] triggerSocialWorkerNow falló:", err);
      });
    }

    return NextResponse.json({
      message: `Se generaron ${createdOpportunities.length} nuevas propuestas usando ${source?.siteUrl ? "Google Search Console y artículos recientes" : "artículos publicados recientes"}.`,
      count: createdOpportunities.length,
    });
  } catch (unexpected) {
    const errorMessage = unexpected instanceof Error ? unexpected.message : String(unexpected);
    const errorStack = unexpected instanceof Error ? unexpected.stack : undefined;
    console.error("[social-opportunities/generate] Error inesperado:", errorMessage);
    if (errorStack) console.error(errorStack);
    return NextResponse.json(
      {
        error: `Error interno al generar propuestas: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
}
