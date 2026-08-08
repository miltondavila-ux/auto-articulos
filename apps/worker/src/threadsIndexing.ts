import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  encryptSecret,
  publishThread,
  refreshThreadsToken,
} from "@auto-articulos/shared";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Pide a la IA un copy estilo Threads de tipo storytelling, amigable y cercano,
 * alternando aleatoriamente entre 5 fórmulas de copywriting para evitar spam y sonar 100% humano.
 */
async function buildThreadsStorytellingCopy(
  finalTitle: string,
  summary: string,
  articleUrl: string
): Promise<string> {
  const formulas = [
    // Fórmula 1: Historia personal/Anécdota cercana
    `Fórmula: Historia personal / Anécdota cercana.
     Pautas: Empieza contando una pequeña anécdota en primera persona como si le hablaras a un amigo de confianza (Ej: "Ayer conversaba con una cliente que me decía...", "Estaba revisando unos casos de... y me di cuenta de algo"). Relata brevemente lo que aprendiste y dile con cariño que escribiste un post rápido en tu blog para ayudarlos en esa situación.`,
    
    // Fórmula 2: Gancho de curiosidad/Secreto revelado
    `Fórmula: Curiosidad y Secreto.
     Pautas: Comienza con una frase de impacto que rompa el scroll (Ej: "Hay una cosa sobre... de la que casi nadie habla y es súper importante...", "Si estás en Florida, hay un detalle con... que te puede ahorrar dolores de cabeza"). Explica brevemente la razón y cierra diciendo que escribiste una guía con todos los detalles en tu blog.`,
     
    // Fórmula 3: Empatía directa / Frustración común
    `Fórmula: Empatía directa con el dolor del cliente.
     Pautas: Empieza con una pregunta directa sobre una frustración muy común del día a día (Ej: "¿Te ha pasado que sientes que el sistema de... está hecho para confundirte?", "¿Por qué nos complican tanto la vida con...?"). Demuestra que estás de su lado y ofréceles la guía sencilla que acabas de subir al blog para resolverlo.`,
     
    // Fórmula 4: Puntos clave rápidos en tono relajado
    `Fórmula: 3 puntos de valor informales.
     Pautas: Escribe una introducción súper corta y directa, y luego enumera 2 o 3 tips súper rápidos y sencillos (Ej: "Dos cosas que debes saber hoy sobre..."). Cierra de forma natural invitándolos a leer la explicación completa en tu sitio.`,
     
    // Fórmula 5: Hot Take / Desmitificación
    `Fórmula: Opinión honesta / Desmitificación.
     Pautas: Comienza cuestionando una idea o mito común de forma amigable (Ej: "Nos han hecho creer que conseguir un... es un dolor de cabeza, pero es más fácil de lo que piensas...", "No te dejes asustar por lo que dicen de..."). Explica el mito brevemente y ofrece tu post como la explicación clara y sin rodeos.`
  ];

  // Elegir una de las 5 fórmulas al azar
  const selectedIndex = Math.floor(Math.random() * formulas.length);
  const selectedFormula = formulas[selectedIndex];

  if (!OPENAI_API_KEY) {
    return `${finalTitle}\n\n${summary}\n\nLeer más: ${articleUrl}`.slice(0, 490);
  }

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
              `Eres un profesional amable, empático y experto en seguros y asesoría en Florida. ` +
              `Escribe una publicación para la red social Threads. Debe sonar 100% como si la hubiera escrito una persona real, con cercanía, calidez y un tono conversacional natural (cero lenguaje corporativo, aburrido o publicitario).\n\n` +
              `INSTRUCCIONES DE ESTILO ESPECÍFICAS A SEGUIR:\n` +
              `${selectedFormula}\n\n` +
              `REGLAS CRÍTICAS DE FORMATO:\n` +
              `- El texto total DEBE ser menor a 360 caracteres para asegurar que quepa el enlace y no se corte.\n` +
              `- No uses hashtags (#) ni formato markdown (nada de negritas, cursivas o asteriscos).\n` +
              `- NO escribas la URL del artículo directamente. Escribe la palabra exacta "[ENLACE]" (en mayúsculas y con corchetes) al final, integrada en tu frase de cierre (Ej: "Hace un rato lo subí aquí: [ENLACE]" o "Te dejo el enlace si quieres echarle un ojo: [ENLACE]").\n\n` +
              `Datos del artículo:\n` +
              `- Título del artículo: ${finalTitle}\n` +
              `- Resumen: ${summary}`,
          },
        ],
        temperature: 0.85,
        max_tokens: 300,
      }),
    });
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!response.ok || !text) {
      return `${finalTitle}\n\n${summary}\n\nLeer más: ${articleUrl}`.slice(0, 490);
    }

    // Reemplazar el marcador de posición por el enlace real e intacto
    let finalPost = text;
    if (finalPost.includes("[ENLACE]")) {
      finalPost = finalPost.replace("[ENLACE]", articleUrl);
    } else {
      finalPost = `${finalPost}\n\n${articleUrl}`;
    }

    return finalPost;
  } catch {
    return `${finalTitle}\n\n${summary}\n\nLeer más: ${articleUrl}`.slice(0, 490);
  }
}

/**
 * Publica un Hilo automático en Meta Threads tras divulgar el artículo en 10minutesWebsite.
 * Es un proceso no bloqueante: si falla o no está configurado, la publicación del artículo se mantiene exitosa.
 */
export async function notifyThreads(titleId: string, userId: string): Promise<void> {
  const integration = await prisma.threadsIntegration.findUnique({
    where: { userId },
  });

  if (!integration) {
    await prisma.title.update({
      where: { id: titleId },
      data: { threadsPublishStatus: "not_configured" },
    });
    return;
  }

  const title = await prisma.title.findUnique({
    where: { id: titleId },
  });

  if (!title || !title.articleUrl) {
    return;
  }

  try {
    let accessToken = decryptSecret(integration.accessTokenEncrypted);

    // Refrescar automáticamente el token si vence en menos de 7 días
    const daysUntilExpiration =
      (integration.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

    if (daysUntilExpiration < 7) {
      try {
        const refreshed = await refreshThreadsToken(accessToken);
        accessToken = refreshed.accessToken;
        const newExpiresAt = new Date(Date.now() + refreshed.expiresInSeconds * 1000);

        await prisma.threadsIntegration.update({
          where: { userId },
          data: {
            accessTokenEncrypted: encryptSecret(accessToken),
            expiresAt: newExpiresAt,
          },
        });
      } catch (refreshErr) {
        console.warn("No se pudo autorrefrescar el token de Threads:", refreshErr);
      }
    }

    // Armar el texto y generar la imagen estilo Threads
    const finalTitle = title.finalTitle || title.text;
    const summary = title.summary || "";
    const articleUrl = title.articleUrl;

    const threadsContent = await buildThreadsStorytellingCopy(finalTitle, summary, articleUrl);

    const result = await publishThread(
      accessToken,
      integration.threadsUserId,
      threadsContent
    );

    await prisma.title.update({
      where: { id: titleId },
      data: {
        threadsPublishStatus: "success",
        threadsPostId: result.postId,
        threadsPublishAt: new Date(),
        threadsPublishError: null,
      },
    });

    await prisma.titleEvent.create({
      data: {
        titleId,
        message: `Publicado exitosamente en Meta Threads (@${integration.threadsUsername || integration.threadsUserId}) - ID: ${result.postId}`,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error al publicar en Meta Threads para title ${titleId}:`, errorMsg);

    await prisma.title.update({
      where: { id: titleId },
      data: {
        threadsPublishStatus: "error",
        threadsPublishError: errorMsg,
      },
    });

    await prisma.titleEvent.create({
      data: {
        titleId,
        message: `Publicación en Meta Threads falló: ${errorMsg}`,
      },
    });
  }
}
