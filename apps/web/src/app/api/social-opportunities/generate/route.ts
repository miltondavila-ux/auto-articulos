import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { canUseSocialModule } from "@/lib/social-access";
import { triggerSocialWorkerNow } from "@/lib/trigger-worker";
import {
  decryptSecret,
  getGoogleAccessToken,
  queryGoogleSearchAnalytics,
} from "@auto-articulos/shared";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

type ArticleCandidate = {
  id: string;
  finalTitle: string | null;
  text: string;
  summary: string | null;
  articleUrl: string | null;
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
  summary: string
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
  const charLimit = isLinkedIn ? 1300 : isFacebookPage ? 700 : isInstagramFeedCaption ? 1000 : isPinterest ? 800 : 360;
  const maxTokens = isLinkedIn ? 700 : isFacebookPage ? 450 : isInstagramFeedCaption ? 550 : isPinterest ? 500 : 300;
  const styleNote = isLinkedIn
    ? "Tono profesional pero cercano (LinkedIn), con más contexto y valor. Puedes usar párrafos cortos separados por saltos de línea."
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
              `- No uses frases vacías, tono frío, lenguaje corporativo ni expresiones que parezcan generadas automáticamente.\n` +
              (isInstagramFeedCaption
                ? `- Instagram no muestra enlaces clicables en el caption — NUNCA escribas una URL ni la palabra "[ENLACE]". En vez de eso, termina con al menos 5 hashtags reales, en español, sacados de palabras clave del tema y contenido del artículo (no genéricos como #instagram) — sin espacios dentro de cada hashtag, separados entre sí por un espacio, en su propia línea al final.\n\n`
                : `- No uses hashtags (#) ni formato markdown.\n` +
                  `- NO escribas la URL del artículo directamente. Escribe la palabra exacta "[ENLACE]" (en mayúsculas y con corchetes) al final, integrada en tu frase de cierre (Ej: "Te lo explico con peras y manzanas aquí: [ENLACE]").\n\n`) +
              `Datos:\n` +
              `- Título del artículo: ${finalTitle}\n` +
              `- Resumen: ${summary}`,
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

async function selectArticlesWithGSC(userId: string): Promise<ArticleCandidate[]> {
  const gsc = await prisma.searchIntegration.findUnique({
    where: { userId_provider: { userId, provider: "google" } },
  });
  if (!gsc?.siteUrl || !gsc.encryptedRefreshToken) return [];

  try {
    const accessToken = await getGoogleAccessToken(decryptSecret(gsc.encryptedRefreshToken));
    const endDate = new Date();
    const startDate = new Date(Date.now() - 30 * 86400000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const rows = await queryGoogleSearchAnalytics(
      accessToken,
      gsc.siteUrl,
      fmt(startDate),
      fmt(endDate),
      ["page"],
    );

    if (rows.length === 0) return [];

    const gscUrls = rows.map((r) => r.keys[0]);

    const articles = await prisma.title.findMany({
      where: {
        run: { userId },
        status: "success",
        articleUrl: { in: gscUrls },
      },
      select: { id: true, finalTitle: true, text: true, summary: true, articleUrl: true },
    });

    const urlOrder = new Map(gscUrls.map((url, i) => [url, i]));
    articles.sort((a, b) => (urlOrder.get(a.articleUrl!) ?? 999) - (urlOrder.get(b.articleUrl!) ?? 999));

    return articles;
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

async function getConnectedNetworks(userId: string) {
  const [threads, twitter, linkedin, instagram, facebookPage, pinterest, tumblr, bluesky, mastodon, devto, user] = await Promise.all([
    prisma.threadsIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.twitterIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.linkedInIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.instagramIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.facebookPageIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.pinterestIntegration.findUnique({ where: { userId }, select: { id: true, boardId: true, expiresAt: true } }),
    prisma.tumblrIntegration.findUnique({ where: { userId }, select: { id: true, expiresAt: true } }),
    prisma.blueskyIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.mastodonIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.devToIntegration.findUnique({ where: { userId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true, allowPinterestPublishing: true, allowTumblrPublishing: true, allowBlueskyPublishing: true, allowMastodonPublishing: true, allowDevToPublishing: true } }),
  ]);
  return {
    threads: Boolean(threads),
    x: Boolean(twitter),
    linkedin: Boolean(linkedin),
    instagram: Boolean(instagram),
    facebookPage: Boolean(facebookPage),
    pinterest: Boolean(user?.role === "admin" || user?.allowPinterestPublishing) && Boolean(pinterest && pinterest.boardId && (!pinterest.expiresAt || pinterest.expiresAt > new Date())),
    tumblr: Boolean(user?.role === "admin" || user?.allowTumblrPublishing) && Boolean(tumblr && (!tumblr.expiresAt || tumblr.expiresAt > new Date())),
    bluesky: Boolean(user?.role === "admin" || user?.allowBlueskyPublishing) && Boolean(bluesky),
    mastodon: Boolean(user?.role === "admin" || user?.allowMastodonPublishing) && Boolean(mastodon),
    devto: Boolean(user?.role === "admin" || user?.allowDevToPublishing) && Boolean(devto),
  };
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
      ? body.networks.filter((network) => network === "threads" || network === "x" || network === "linkedin" || network === "instagram" || network === "facebook-page" || network === "pinterest" || network === "tumblr" || network === "bluesky" || network === "mastodon" || network === "devto")
      : ["threads", "x", "linkedin", "instagram", "facebook-page", "pinterest", "tumblr", "bluesky", "mastodon", "devto"];

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
    if (requestedNetworks.includes("mastodon") && connected.mastodon) {
      integrations.push("mastodon");
    }
    if (requestedNetworks.includes("devto") && connected.devto) {
      integrations.push("devto");
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

    const [gscCandidates, recentCandidates] = await Promise.all([
      selectArticlesWithGSC(userId),
      selectArticlesWithoutGSC(userId),
    ]);
    const candidateMap = new Map<string, ArticleCandidate>();
    for (const article of [...gscCandidates, ...recentCandidates]) {
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
    const normalizedIntegrations = integrations.map(normalizePlatform);
    const candidates = allCandidates
      .filter((article) =>
        normalizedIntegrations.some((platform) => !activeKeys.has(`${article.id}:${platform}`)),
      )
      .slice(0, 3);

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

    for (const article of candidates) {
      for (const platform of integrations) {
        const opportunityKey = `${article.id}:${normalizePlatform(platform)}`;
        if (activeKeys.has(opportunityKey)) continue;

        const copyText = await generateGPTCopy(
          platform,
          article.finalTitle || article.text,
          article.summary || ""
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

    const source = await prisma.searchIntegration.findUnique({
      where: { userId_provider: { userId, provider: "google" } },
    });

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
