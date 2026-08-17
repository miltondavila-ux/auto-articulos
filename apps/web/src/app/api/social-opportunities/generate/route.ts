import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { canUseSocialModule } from "@/lib/social-access";
import { triggerWorkerNow } from "@/lib/trigger-worker";
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
    ? "Tono profesional pero cercano (LinkedIn), con más contexto y valor. Puedes usar párrafos cortos separados por saltos de línea."
    : isFacebookPage
    ? "Tono cálido y útil de Facebook Page: presenta el beneficio del artículo, usa uno o dos párrafos breves y una invitación clara a leerlo. Debe ser diferente a Threads y LinkedIn."
    : "Tono súper casual y directo, como un mensaje rápido a un amigo.";
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
              `- No uses hashtags (#) ni formato markdown.\n` +
              `- NO escribas la URL del artículo directamente. Escribe la palabra exacta "[ENLACE]" (en mayúsculas y con corchetes) al final, integrada en tu frase de cierre (Ej: "Te lo explico con peras y manzanas aquí: [ENLACE]").\n\n` +
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
  const [threads, twitter, linkedin, instagram, facebookPage, user] = await Promise.all([
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
        integrations.push("instagram-carousel");
        integrations.push("instagram-reel-image");
        integrations.push("instagram-infografia");
      }
    }

    if (integrations.length === 0) {
      return NextResponse.json(
        { error: "La red seleccionada no está conectada en tu configuración." },
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
    const allCandidates = Array.from(candidateMap.values());

    const activeOpportunities = await prisma.socialOpportunity.findMany({
      where: {
        userId,
        titleId: { in: allCandidates.map((article) => article.id) },
        platform: { in: integrations },
        status: { in: ["pending", "queued", "processing"] },
      },
      select: { titleId: true, platform: true },
    });
    const activeKeys = new Set(
      activeOpportunities.map((opportunity) => `${opportunity.titleId}:${opportunity.platform}`),
    );
    const candidates = allCandidates
      .filter((article) =>
        integrations.some((platform) => !activeKeys.has(`${article.id}:${platform}`)),
      )
      .slice(0, 3);

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "No hay artículos nuevos disponibles. Todos los artículos publicados ya tienen una oportunidad generada." },
        { status: 400 }
      );
    }

    const createdOpportunities: any[] = [];

    for (const article of candidates) {
      for (const platform of integrations) {
        const opportunityKey = `${article.id}:${platform}`;
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
      void triggerWorkerNow().catch((err) => {
        console.error("[social-opportunities/generate] triggerWorkerNow falló:", err);
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
