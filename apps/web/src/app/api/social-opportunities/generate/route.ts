import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { canUseSocialModule } from "@/lib/social-access";
import { triggerSocialWorkerNow } from "@/lib/trigger-worker";
import {
  decryptSecret,
  getGoogleAccessToken,
  getBingPageQueryStats,
  getBingPageStats,
  queryGoogleSearchAnalytics,
} from "@auto-articulos/shared";
import { getBingTokenForIntegration } from "@/lib/bing-token";
import { getGoogleAnalyticsSignals, summarizeGoogleAnalyticsSignals } from "@/lib/google-analytics-signals";

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

type PublishedArticleCandidate = ArticleCandidate & { articleUrl: string };

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
  if (!OPENAI_API_KEY) {
    return `${finalTitle}\n\n${summary}\n\nLeer más: [ENLACE]`;
  }
  const selectedFormula = formulas[Math.floor(Math.random() * formulas.length)];
  // LinkedIn permite hasta 3000 caracteres y funciona mejor con posts más
  // elaborados; Threads/X son de formato corto (límites reales 500/280).
  const isLinkedIn = platform === "linkedin";
  const isFacebookPage = platform === "facebook-page";
  const charLimit = isLinkedIn ? 1300 : isFacebookPage ? 700 : 360;
  const maxTokens = isLinkedIn ? 700 : isFacebookPage ? 450 : 300;
  const styleNote = isLinkedIn
    ? "LinkedIn: tono profesional, empático y cercano; aporta contexto, criterio y autoridad sin sonar corporativo. Conecta con una necesidad real del lector y usa párrafos cortos."
    : isFacebookPage
    ? "Facebook Page: tono cálido, humano y conversacional; reconoce el problema de la persona, explica el beneficio con claridad y cierra con una invitación cercana. Debe sentirse como una recomendación útil, no como un anuncio."
    : platform === "instagram"
    ? "Instagram: tono visual, emocional, cercano y fácil de leer; abre con una frase que detenga el desplazamiento, conecta con una necesidad concreta y deja una idea útil. Evita sonar genérico o automatizado."
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
              `Eres Lorena Alvarez, una asesora de seguros en Florida profesional, cercana, alegre, empática y de gran confianza. ` +
              `Escribe una publicación optimizada para la red social ${platform}. Debe sonar 100% natural, en primera persona del singular ("yo", "mi", "me"). ${styleNote}\n\n` +
              `INSTRUCCIONES DE ESTILO ESPECÍFICAS:\n` +
              `${selectedFormula}\n\n` +
              `REGLAS CRÍTICAS:\n` +
              `- El texto debe ser menor a ${charLimit} caracteres.\n` +
              `- Habla desde la necesidad real del lector: demuestra que entiendes su preocupación antes de presentar la información.\n` +
              `- Sé empática, cercana y humana; conecta con la persona sin dramatizar, manipular ni prometer resultados.\n` +
              `- Refuerza autoridad mediante claridad, experiencia y utilidad concreta, nunca mediante frases grandilocuentes.\n` +
              `- No uses frases vacías, tono frío, lenguaje corporativo ni expresiones que parezcan generadas automáticamente.\n` +
              `- No uses hashtags (#) ni formato markdown.\n` +
              `- NO escribas la URL del artículo directamente. Escribe la palabra exacta "[ENLACE]" (en mayúsculas y con corchetes) al final, integrada en tu frase de cierre (Ej: "Te lo explico con peras y manzanas aquí: [ENLACE]").\n\n` +
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
    return data.choices?.[0]?.message?.content?.trim() ?? `${finalTitle}\n\nLeer más: [ENLACE]`;
  } catch {
    return `${finalTitle}\n\nLeer más: [ENLACE]`;
  }
}

async function selectArticlesWithGSC(userId: string): Promise<ArticleCandidate[]> {
  const gsc = await prisma.searchIntegration.findUnique({
    where: { userId_provider: { userId, provider: "google" } },
  });
  if (!gsc?.siteUrl || !gsc.encryptedRefreshToken) return [];

  try {
    const accessToken = await getGoogleAccessToken(decryptSecret(gsc.encryptedRefreshToken));
    // Search Console consolida los últimos días con retraso. Excluirlos evita
    // comparar datos parciales contra un período anterior completo.
    const endDate = new Date();
    endDate.setUTCDate(endDate.getUTCDate() - 3);
    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - 27);
    const previousEndDate = new Date(startDate);
    previousEndDate.setUTCDate(previousEndDate.getUTCDate() - 1);
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setUTCDate(previousStartDate.getUTCDate() - 27);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const [rows, previousRows] = await Promise.all([
      queryGoogleSearchAnalytics(
        accessToken,
        gsc.siteUrl,
        fmt(startDate),
        fmt(endDate),
        ["query", "page"],
      ),
      queryGoogleSearchAnalytics(
        accessToken,
        gsc.siteUrl,
        fmt(previousStartDate),
        fmt(previousEndDate),
        ["query", "page"],
      ),
    ]);

    if (rows.length === 0) return [];

    const articleUrls = Array.from(new Set(rows.map((row) => row.keys[1]).filter(Boolean)));

    const articles = await prisma.title.findMany({
      where: {
        run: { userId },
        status: "success",
        articleUrl: { in: articleUrls },
      },
      select: { id: true, finalTitle: true, text: true, summary: true, articleUrl: true },
    });
    const articlesByUrl = new Map(
      articles
        .filter((article): article is PublishedArticleCandidate => Boolean(article.articleUrl))
        .map((article) => [article.articleUrl, article]),
    );
    if (articlesByUrl.size === 0) return [];

    const previousByQueryAndPage = new Map(
      previousRows.map((row) => [`${row.keys[0]}\u0000${row.keys[1]}`, row]),
    );
    type PageSignals = {
      impressions: number;
      clicks: number;
      weightedPosition: number;
      previousImpressions: number;
      queries: Map<string, number>;
    };
    const signalsByUrl = new Map<string, PageSignals>();

    for (const row of rows) {
      const [query, page] = row.keys;
      if (!query || !page || !articlesByUrl.has(page)) continue;
      const signal = signalsByUrl.get(page) ?? {
        impressions: 0,
        clicks: 0,
        weightedPosition: 0,
        previousImpressions: 0,
        queries: new Map<string, number>(),
      };
      const previous = previousByQueryAndPage.get(`${query}\u0000${page}`);
      signal.impressions += row.impressions;
      signal.clicks += row.clicks;
      signal.weightedPosition += row.position * row.impressions;
      signal.previousImpressions += previous?.impressions ?? 0;
      signal.queries.set(query, (signal.queries.get(query) ?? 0) + row.impressions);
      signalsByUrl.set(page, signal);
    }

    return Array.from(signalsByUrl.entries())
      .map(([articleUrl, signal]) => {
        const article = articlesByUrl.get(articleUrl)!;
        const averagePosition = signal.weightedPosition / Math.max(signal.impressions, 1);
        const ctr = signal.clicks / Math.max(signal.impressions, 1);
        const growthRate = (signal.impressions - signal.previousImpressions) /
          Math.max(signal.previousImpressions, 20);
        const longTailCount = Array.from(signal.queries.keys())
          .filter((query) => query.trim().split(/\s+/).length >= 3).length;
        // Priorizamos demanda real, crecimiento, visibilidad alcanzable y
        // preguntas long tail. Un CTR bajo suma solo cuando ya hay volumen.
        const score =
          Math.log10(signal.impressions + 1) * 20 +
          Math.min(Math.max(growthRate, 0) * 15, 25) +
          (averagePosition >= 4 && averagePosition <= 20 ? 18 : averagePosition >= 2 && averagePosition < 4 ? 8 : averagePosition <= 40 ? 5 : 0) +
          (signal.impressions >= 20 && ctr < 0.05 ? 12 : 0) +
          Math.min(longTailCount, 3) * 5;
        const searchQueries = Array.from(signal.queries.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([query]) => query);
        return { article, score, searchQueries };
      })
      .sort((a, b) => b.score - a.score)
      .map(({ article, searchQueries }) => ({ ...article, searchQueries }));
  } catch {
    return [];
  }
}

async function selectArticlesWithoutGSC(userId: string): Promise<ArticleCandidate[]> {
  return prisma.title.findMany({
    where: {
      run: { userId },
      status: "success",
      articleUrl: { not: null },
    },
    orderBy: { processedAt: "desc" },
    take: 10,
    select: { id: true, finalTitle: true, text: true, summary: true, articleUrl: true },
  });
}

function normalizedArticleUrl(value: string) {
  try {
    const url = new URL(value);
    const pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "");
    return `${url.origin}${pathname}`;
  } catch {
    return value;
  }
}

async function selectArticlesWithBing(userId: string): Promise<ArticleCandidate[]> {
  const integration = await prisma.searchIntegration.findUnique({
    where: { userId_provider: { userId, provider: "bing" } },
  });
  if (!integration?.siteUrl) return [];

  try {
    const accessToken = await getBingTokenForIntegration(integration);
    const articles = await prisma.title.findMany({
      where: { run: { userId }, status: "success", articleUrl: { not: null } },
      select: { id: true, finalTitle: true, text: true, summary: true, articleUrl: true },
    });
    const articlesByUrl = new Map(
      articles
        .filter((article): article is PublishedArticleCandidate => Boolean(article.articleUrl))
        .map((article) => [normalizedArticleUrl(article.articleUrl), article]),
    );
    if (articlesByUrl.size === 0) return [];

    const pageStats = await getBingPageStats(accessToken, integration.siteUrl);
    const matchingPages = pageStats
      .map((stat) => ({ stat, article: articlesByUrl.get(normalizedArticleUrl(stat.Query)) }))
      .filter((item): item is { stat: typeof item.stat; article: PublishedArticleCandidate } => Boolean(item.article))
      .sort((a, b) => b.stat.Impressions - a.stat.Impressions)
      // Limita las llamadas para proteger cuotas y tiempos de respuesta.
      .slice(0, 12);

    const candidates: Array<{ article: ArticleCandidate; score: number; searchQueries: string[] }> = [];
    for (const { stat, article } of matchingPages) {
      const queryStats = await getBingPageQueryStats(accessToken, integration.siteUrl, stat.Query);
      const queries = queryStats
        .filter((item) => item.Query)
        .sort((a, b) => b.Impressions - a.Impressions);
      const queryImpressions = queries.reduce((sum, item) => sum + item.Impressions, 0);
      const queryClicks = queries.reduce((sum, item) => sum + item.Clicks, 0);
      const impressions = queryImpressions || stat.Impressions;
      const clicks = queryClicks || stat.Clicks;
      const position = stat.AvgImpressionPosition ?? stat.AvgClickPosition ?? 100;
      const ctr = clicks / Math.max(impressions, 1);
      const longTailCount = queries.filter((item) => item.Query.trim().split(/\s+/).length >= 3).length;
      const score =
        Math.log10(impressions + 1) * 20 +
        (position >= 4 && position <= 20 ? 18 : position >= 2 && position < 4 ? 8 : position <= 40 ? 5 : 0) +
        (impressions >= 20 && ctr < 0.05 ? 12 : 0) +
        Math.min(longTailCount, 3) * 5;
      candidates.push({
        article,
        score,
        searchQueries: queries.slice(0, 3).map((item) => item.Query),
      });
    }

    return candidates
      .sort((a, b) => b.score - a.score)
      .map(({ article, searchQueries }) => ({ ...article, searchQueries }));
  } catch (error) {
    // Bing es una fuente adicional: una conexión vencida o una respuesta sin
    // datos no debe impedir que las oportunidades sigan funcionando con Google.
    console.warn("[social-opportunities/generate] Bing no aportó señales:", error);
    return [];
  }
}

function mergeSearchCandidates(
  googleCandidates: ArticleCandidate[],
  bingCandidates: ArticleCandidate[],
): ArticleCandidate[] {
  const merged = new Map<string, { article: ArticleCandidate; score: number; queries: Set<string> }>();
  const add = (candidate: ArticleCandidate, rank: number) => {
    const current = merged.get(candidate.id) ?? {
      article: candidate,
      score: 0,
      queries: new Set<string>(),
    };
    // Cada buscador aporta su propia clasificación; coincidir en ambos suma
    // evidencia, sin comparar directamente sus volúmenes absolutos.
    current.score += Math.max(1, 100 - rank);
    for (const query of candidate.searchQueries ?? []) current.queries.add(query);
    merged.set(candidate.id, current);
  };
  googleCandidates.forEach(add);
  bingCandidates.forEach(add);
  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .map(({ article, queries }) => ({ ...article, searchQueries: Array.from(queries).slice(0, 3) }));
}

async function getConnectedNetworks(userId: string) {
  const [threads, twitter, linkedin, instagram, facebookPage] = await Promise.all([
    prisma.threadsIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.twitterIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.linkedInIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.instagramIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.facebookPageIntegration.findUnique({ where: { userId }, select: { id: true } }),
  ]);
  return { threads: Boolean(threads), x: Boolean(twitter), linkedin: Boolean(linkedin), instagram: Boolean(instagram), facebookPage: Boolean(facebookPage) };
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
      ? body.networks.filter((network) => network === "threads" || network === "x" || network === "linkedin" || network === "instagram" || network === "facebook-page")
      : ["threads", "x", "linkedin", "instagram", "facebook-page"];

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
    }
    if (requestedNetworks.includes("instagram") && connected.instagram) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { allowInstagramPublishing: true },
      });
      if (user?.allowInstagramPublishing) {
        integrations.push("instagram-story");
      }
    }

    if (integrations.length === 0) {
      return NextResponse.json(
        { error: "La red seleccionada no está conectada en tu configuración." },
        { status: 400 }
      );
    }

    const [gscCandidates, bingCandidates] = await Promise.all([
      selectArticlesWithGSC(userId),
      selectArticlesWithBing(userId),
    ]);
    const searchCandidates = mergeSearchCandidates(gscCandidates, bingCandidates);
    // Solo recurrimos a artículos recientes si no hay evidencia GSC asociada a
    // artículos publicados. Cuando algún buscador sí aporta evidencia, manda.
    const allCandidates = searchCandidates.length > 0
      ? searchCandidates
      : await selectArticlesWithoutGSC(userId);

    const candidateIds = allCandidates.map((article) => article.id);
    const candidatesByUrl = new Map(
      allCandidates
        .filter((article): article is ArticleCandidate & { articleUrl: string } => Boolean(article.articleUrl))
        .map((article) => [article.articleUrl, article]),
    );
    // Una oportunidad previa ya es historial de distribución: publicada,
    // descartada o fallida no debe volver a proponerse por accidente.
    // También revisamos articleUrl para cubrir propuestas heredadas sin titleId.
    const previousOpportunities = await prisma.socialOpportunity.findMany({
      where: {
        userId,
        platform: { in: integrations },
        OR: [
          { titleId: { in: candidateIds } },
          { articleUrl: { in: Array.from(candidatesByUrl.keys()) } },
        ],
      },
      select: { titleId: true, articleUrl: true, platform: true },
    });
    const usedKeys = new Set<string>();
    for (const opportunity of previousOpportunities) {
      if (opportunity.titleId) {
        usedKeys.add(`${opportunity.titleId}:${opportunity.platform}`);
      }
      const article = candidatesByUrl.get(opportunity.articleUrl);
      if (article) usedKeys.add(`${article.id}:${opportunity.platform}`);
    }
    const candidates = allCandidates
      .filter((article) =>
        integrations.some((platform) => !usedKeys.has(`${article.id}:${platform}`)),
      )
      .slice(0, 3);

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "No hay artículos nuevos disponibles. Los artículos candidatos ya fueron propuestos, publicados o descartados para esta red." },
        { status: 400 }
      );
    }

    const createdOpportunities: any[] = [];
    const googleAnalyticsContext = JSON.stringify(summarizeGoogleAnalyticsSignals(await getGoogleAnalyticsSignals(userId)));

    for (const article of candidates) {
      for (const platform of integrations) {
        const opportunityKey = `${article.id}:${platform}`;
        if (usedKeys.has(opportunityKey)) continue;

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

        createdOpportunities.push(opp);
        usedKeys.add(opportunityKey);
      }
    }

    if (createdOpportunities.length === 0) {
      return NextResponse.json(
        { error: "Los artículos encontrados ya tienen historial de propuesta, publicación o descarte para las redes seleccionadas." },
        { status: 400 },
      );
    }

    // Despachar el worker de forma no bloqueante para mantener la respuesta ágil.
    if (createdOpportunities.length > 0) {
      void triggerSocialWorkerNow().catch((err) => {
        console.error("[social-opportunities/generate] triggerSocialWorkerNow falló:", err);
      });
    }

    return NextResponse.json({
      message: `Se generaron ${createdOpportunities.length} nuevas propuestas usando ${gscCandidates.length > 0 && bingCandidates.length > 0 ? "señales de Google Search Console y Bing Webmaster" : gscCandidates.length > 0 ? "consultas, tendencia y rendimiento de Google Search Console" : bingCandidates.length > 0 ? "consultas y rendimiento de Bing Webmaster" : "artículos publicados recientes (sin señales de buscadores asociadas)"}.`,
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
