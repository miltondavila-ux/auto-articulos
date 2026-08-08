import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

// Reusamos el generador de copy aleatorio del worker
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

export async function POST() {
  try {
    const userId = await getCurrentUserId();

    // Buscar los 3 artículos publicados con éxito más recientes
    const latestArticles = await prisma.title.findMany({
      where: {
        run: { userId },
        status: "success",
        articleUrl: { not: null },
      },
      orderBy: { processedAt: "desc" },
      take: 3,
    });

    if (latestArticles.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron artículos publicados con éxito en tu blog para generar oportunidades." },
        { status: 400 }
      );
    }

    // Verificar qué integraciones tiene conectadas el usuario
    const integrations = [];
    const threads = await prisma.threadsIntegration.findUnique({ where: { userId } });
    if (threads) integrations.push("threads");

    // Si no hay redes conectadas
    if (integrations.length === 0) {
      return NextResponse.json(
        { error: "Primero debes conectar al menos una red social (ej. Threads) en tu configuración." },
        { status: 400 }
      );
    }

    const createdOpportunities = [];

    // Generar oportunidades de copy para cada artículo y red conectada
    for (const article of latestArticles) {
      for (const platform of integrations) {
        // Verificar si ya existe una oportunidad pendiente para este artículo y plataforma
        const exists = await prisma.socialOpportunity.findFirst({
          where: {
            userId,
            titleId: article.id,
            platform,
            status: "pending",
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

    return NextResponse.json({
      message: `Se generaron ${createdOpportunities.length} nuevas propuestas de redes sociales.`,
      count: createdOpportunities.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
