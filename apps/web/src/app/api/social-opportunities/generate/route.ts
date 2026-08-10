import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import {
  decryptSecret,
  getGoogleAccessToken,
  queryGoogleSearchAnalytics,
} from "@auto-articulos/shared";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

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
              `Escribe una publicación optimizada para la red social ${platform}. Debe sonar 100% natural, en primera persona del singular ("yo", "mi", "me").\n\n` +
              `INSTRUCCIONES DE ESTILO ESPECÍFICAS:\n` +
              `${selectedFormula}\n\n` +
              `REGLAS CRÍTICAS:\n` +
              `- El texto debe ser menor a 360 caracteres.\n` +
              `- No uses hashtags (#) ni formato markdown.\n` +
              `- NO escribas la URL del artículo directamente. Escribe la palabra exacta "[ENLACE]" (en mayúsculas y con corchetes) al final, integrada en tu frase de cierre (Ej: "Te lo explico con peras y manzanas aquí: [ENLACE]").\n\n` +
              `Datos:\n` +
              `- Título del artículo: ${finalTitle}\n` +
              `- Resumen: ${summary}`,
          },
        ],
        temperature: 0.85,
        max_tokens: 300,
      }),
    });
    const data = (await response.json()) as any;
    return data.choices?.[0]?.message?.content?.trim() ?? `${finalTitle}\n\nLeer más: [ENLACE]`;
  } catch {
    return `${finalTitle}\n\nLeer más: [ENLACE]`;
  }
}

async function selectArticlesWithGSC(userId: string): Promise<{ id: string; finalTitle: string | null; text: string; summary: string | null; articleUrl: string | null }[]> {
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

async function selectArticlesWithoutGSC(userId: string): Promise<{ id: string; finalTitle: string | null; text: string; summary: string | null; articleUrl: string | null }[]> {
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

export async function POST() {
  try {
    const userId = await getCurrentUserId();

    const integrations: string[] = [];
    const threads = await prisma.threadsIntegration.findUnique({ where: { userId } });
    if (threads) integrations.push("threads");
    const instagram = await prisma.instagramIntegration.findUnique({ where: { userId } });
    if (instagram) {
      integrations.push("instagram-carousel");
      integrations.push("instagram-reel-image");
      integrations.push("instagram-infografia");
    }

    if (integrations.length === 0) {
      return NextResponse.json(
        { error: "Primero debes conectar al menos una red social (ej. Threads, Instagram) en tu configuración." },
        { status: 400 }
      );
    }

    let candidates = await selectArticlesWithGSC(userId);

    if (candidates.length === 0) {
      candidates = await selectArticlesWithoutGSC(userId);
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "No hay artículos nuevos disponibles. Todos los artículos publicados ya tienen una oportunidad generada." },
        { status: 400 }
      );
    }

    const createdOpportunities: any[] = [];

    for (const article of candidates) {
      for (const platform of integrations) {
        const exists = await prisma.socialOpportunity.findFirst({
          where: {
            userId,
            titleId: article.id,
            platform,
            status: { in: ["pending", "queued", "processing"] },
          },
        });
        if (exists) continue;

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
        createdOpportunities.push(opp);
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

    return NextResponse.json({
      message: `Se generaron ${createdOpportunities.length} nuevas propuestas basadas en ${source?.siteUrl ? "Google Search Console (mejores temas)" : "artículos más recientes sin usar"}.`,
      count: createdOpportunities.length,
    });
  } catch {
    return NextResponse.json({ error: "Error interno al generar propuestas" }, { status: 500 });
  }
}
