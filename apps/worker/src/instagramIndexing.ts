import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  encryptSecret,
  publishInstagramCarousel,
  publishInstagramImage,
  refreshInstagramToken,
} from "@auto-articulos/shared";
import { put } from "@vercel/blob";
import { buildImagePrompt } from "./imagePrompt";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";

const MAX_CAROUSEL_IMAGES = 5;

// ─── FÓRMULAS DE COPY PARA CADA FORMATO ───────────────────────────────────

const carouselFormulas = [
  `Fórmula: Pasos o tips enumerados.
   Pautas: Empieza con un gancho de valor ("3 cosas que necesitas saber sobre...", "La guía definitiva en X pasos..."). Enumera brevemente los puntos clave de forma natural y amigable, como consejos de una amiga experta. Cierra con la invitación a leer el artículo completo.`,
  `Fórmula: Antes y después / Transformación.
   Pautas: Comienza describiendo una situación confusa o difícil ("Hasta hace poco pensaba que...", "Durante meses batallé con... hasta que descubrí..."). Explica el cambio y ofrece el artículo como la guía que te hubiera gustado tener.`,
  `Fórmula: Pregunta + Solución visual.
   Pautas: Abre con una pregunta directa a la audiencia ("¿Sabías que...?", "¿Te has preguntado por qué...?"). Da la respuesta de forma clara y atractiva. Cada imagen del carrusel es un punto clave visual, el texto las complementa.`,
];

const reelImageFormulas = [
  `Fórmula: Hook visual tipo portada de Reel.
   Pautas: Texto corto, directo, que acompañe una imagen vertical impactante. Empieza con una frase de alto impacto ("Esto es lo que NADIE te dice sobre...", "Si estás en Florida y no sabes esto, te está costando dinero."). Explica rápido el valor y dirige al artículo. Una sola imagen, estilo portada de reel.`,
  `Fórmula: Dato impactante + llamado sutil.
   Pautas: Abre con un dato concreto en la primera línea ("El 70% de las personas en Florida...", "Sabías que..."). La imagen es tipo fondos con tipografía grande. Texto de apoyo breve en el caption.`,
  `Fórmula: Mini consejo en formato reel.
   Pautas: "Un tip rápido sobre..." Formato muy breve, un párrafo de máximo 3 líneas. La imagen debe ser algo visualmente llamativo tipo fondo gradient con texto superpuesto.`,
];

const infografiaFormulas = [
  `Fórmula: Dato educativo con valor.
   Pautas: Texto que explica un concepto o dato importante de forma clara y sencilla. La imagen debe ser una infografía informativa con números y datos. Tono: "Te explico esto que a mí me costó trabajo aprender..."`,
  `Fórmula: Comparativa visual.
   Pautas: Compara dos opciones, escenarios o momentos. ("Opción A vs Opción B", "Antes pensaba que... ahora sé que..."). La imagen muestra una comparación visual. Texto del caption explicando la comparación.`,
  `Fórmula: Checklist o lista corta.
   Pautas: "Esto es lo que tienes que saber sobre..." Lista de 3-5 puntos clave en formato infografía visual. Caption: introduce la lista y cierra con el enlace al artículo.`,
];

function getRandomFormula(formulas: string[]): string {
  return formulas[Math.floor(Math.random() * formulas.length)];
}

// ─── GENERACIÓN DE COPY PARA CADA FORMATO ─────────────────────────────────

async function buildInstagramCopy(
  format: "carousel" | "reel-image" | "infografia",
  finalTitle: string,
  summary: string,
  articleUrl: string
): Promise<string> {
  let formulas: string[];
  let formatLabel: string;

  switch (format) {
    case "carousel":
      formulas = carouselFormulas;
      formatLabel = "CAROUSEL (varias imágenes swipeables)";
      break;
    case "reel-image":
      formulas = reelImageFormulas;
      formatLabel = "IMAGEN ESTILO REEL (imagen vertical 9:16 sola)";
      break;
    case "infografia":
      formulas = infografiaFormulas;
      formatLabel = "INFOGRAFÍA (imagen informativa con datos/gráficos)";
      break;
  }

  const selectedFormula = getRandomFormula(formulas);

  if (!OPENAI_API_KEY) {
    return `${finalTitle}\n\n${summary}\n\n${articleUrl}`.slice(0, 2190);
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
              `Eres Lorena Alvarez, una asesora de seguros en Florida súper cercana, alegre, empática y de gran confianza. ` +
              `Escribe una publicación para Instagram (${formatLabel}). ` +
              `Debe sonar 100% natural, escrita por una persona real, en primera persona del singular ("yo", "mi", "me").\n\n` +
              `REGLAS DE TONO Y ESTILO:\n` +
              `- Tono fresco, conversacional, cercano, como si le hablaras a un amigo.\n` +
              `- No uses jerga técnica de seguros.\n` +
              `- Evita hashtags a menos que sean muy naturales (máximo 2-3 al final, opcionales).\n` +
              `- No uses markdown ni asteriscos.\n\n` +
              `INSTRUCCIONES DE ESTILO:\n` +
              `${selectedFormula}\n\n` +
              `FORMATO:\n` +
              `- Texto máximo 2000 caracteres.\n` +
              `- Incluye la URL del artículo al final, pero escríbela como parte natural del texto: "Te dejo el enlace en mi perfil para que le eches un ojo: ${articleUrl}".\n` +
              `- NO uses marcadores como [ENLACE]. Escribe la URL directamente.\n\n` +
              `Datos del artículo:\n` +
              `- Título: ${finalTitle}\n` +
              `- Resumen: ${summary}`,
          },
        ],
        temperature: 0.85,
        max_tokens: 500,
      }),
    });
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!response.ok || !text) {
      return `${finalTitle}\n\n${summary}\n\n${articleUrl}`.slice(0, 2190);
    }
    return text;
  } catch {
    return `${finalTitle}\n\n${summary}\n\n${articleUrl}`.slice(0, 2190);
  }
}

// ─── GENERACIÓN DE IMÁGENES PARA CADA FORMATO ────────────────────────────

async function generateImage(
  titleId: string,
  summary: string,
  format: "carousel" | "reel-image" | "infografia",
  index?: number
): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;

  const basePrompt = buildImagePrompt(summary);
  const models = ["gpt-image-1", "dall-e-3"];

  let styleInstruction: string;
  let size: string;
  let pathPrefix: string;

  switch (format) {
    case "carousel": {
      const withText = index !== undefined ? index % 2 === 0 : false;
      styleInstruction = withText
        ? `Imagen con texto superpuesto grande y llamativo. Fondo visual moderno, colores vibrantes, con una frase clave o tip escrita directamente en la imagen en tipografía grande y audaz. Diseño tipo slide informativo para redes sociales.`
        : `Imagen sin texto, solo visual. Fotografía o ilustración de alta calidad, colores vibrantes, composición profesional. Sin ningún texto superpuesto. Diseñado para redes sociales.`;
      size = "1024x1024";
      pathPrefix = `instagram/carousel/${titleId}`;
      break;
    }
    case "reel-image":
      styleInstruction = `Formato vertical 9:16 tipo portada de Instagram Reel. Texto grande y llamativo superpuesto, fondo degradado con colores profesionales, tipografía moderna. Diseñado para detener el scroll.`;
      size = "1024x1024";
      pathPrefix = `instagram/reel-image/${titleId}`;
      break;
    case "infografia":
      styleInstruction = `Estilo infografía profesional con datos, números, iconos y gráficos minimalistas. Fondo claro con acentos de color. Diseño informativo y fácil de leer.`;
      size = "1024x1024";
      pathPrefix = `instagram/infografia/${titleId}`;
      break;
  }

  for (const model of models) {
    try {
      const prompt = `${basePrompt}\n\n${styleInstruction}`;
      const variation = index !== undefined ? ` -- Variación ${index + 1}` : "";

      const response = await fetch(OPENAI_IMAGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          prompt: prompt + variation,
          size,
          n: 1,
        }),
      });

      const data = (await response.json()) as {
        data?: { url?: string; b64_json?: string }[];
      };

      const imageUrl = data.data?.[0]?.url;
      const b64 = data.data?.[0]?.b64_json;
      let buffer: Buffer;

      if (b64) {
        buffer = Buffer.from(b64, "base64");
      } else if (imageUrl) {
        const imgRes = await fetch(imageUrl);
        const arrayBuffer = await imgRes.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else {
        continue;
      }

      const filename = index !== undefined ? `${index}.png` : "0.png";
      const blob = await put(`${pathPrefix}/${filename}`, buffer, {
        access: "public",
        contentType: "image/png",
      });
      return blob.url;
    } catch (err) {
      console.warn(`Fallo al generar imagen ${format}/${index} con modelo ${model}:`, err);
    }
  }
  return null;
}

async function generateCarouselImages(
  titleId: string,
  summary: string,
  count: number
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < count; i++) {
    const url = await generateImage(titleId, summary, "carousel", i);
    if (url) urls.push(url);
  }
  return urls;
}

// ─── FUNCIÓN PRINCIPAL DE PUBLICACIÓN ─────────────────────────────────────

export async function publishInstagramContent(
  titleId: string,
  userId: string,
  format: "carousel" | "reel-image" | "infografia"
): Promise<void> {
  const integration = await prisma.instagramIntegration.findUnique({
    where: { userId },
  });

  if (!integration) {
    await prisma.title.update({
      where: { id: titleId },
      data: { instagramPublishStatus: "not_configured" },
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

    const daysUntilExpiration =
      (integration.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

    if (daysUntilExpiration < 7) {
      try {
        const refreshed = await refreshInstagramToken(accessToken);
        accessToken = refreshed.accessToken;
        const newExpiresAt = new Date(Date.now() + refreshed.expiresInSeconds * 1000);

        await prisma.instagramIntegration.update({
          where: { userId },
          data: {
            accessTokenEncrypted: encryptSecret(accessToken),
            expiresAt: newExpiresAt,
          },
        });
      } catch (refreshErr) {
        console.warn("No se pudo autorrefrescar el token de Instagram:", refreshErr);
      }
    }

    const finalTitle = title.finalTitle || title.text;
    const summary = title.summary || "";
    const articleUrl = title.articleUrl;

    const igCopy = await buildInstagramCopy(format, finalTitle, summary, articleUrl);

    let result;

    switch (format) {
      case "carousel": {
        const imageUrls = await generateCarouselImages(
          titleId,
          summary,
          MAX_CAROUSEL_IMAGES
        );

        if (imageUrls.length < 2) {
          throw new Error(
            `No se pudieron generar suficientes imágenes para el carrusel (solo ${imageUrls.length}).`
          );
        }

        result = await publishInstagramCarousel(
          accessToken,
          integration.instagramBusinessAccountId,
          imageUrls,
          igCopy
        );
        break;
      }

      case "reel-image": {
        const imageUrl = await generateImage(titleId, summary, "reel-image");
        if (!imageUrl) {
          throw new Error("No se pudo generar la imagen estilo Reel.");
        }

        result = await publishInstagramImage(
          accessToken,
          integration.instagramBusinessAccountId,
          imageUrl,
          igCopy
        );
        break;
      }

      case "infografia": {
        const imageUrl = await generateImage(titleId, summary, "infografia");
        if (!imageUrl) {
          throw new Error("No se pudo generar la infografía.");
        }

        result = await publishInstagramImage(
          accessToken,
          integration.instagramBusinessAccountId,
          imageUrl,
          igCopy
        );
        break;
      }
    }

    await prisma.title.update({
      where: { id: titleId },
      data: {
        instagramPublishStatus: "success",
        instagramPostId: result.permalink || result.postId,
        instagramPublishAt: new Date(),
        instagramPublishError: null,
      },
    });

    const formatLabel = format === "carousel" ? "Carrusel" : format === "reel-image" ? "Reel-image" : "Infografía";

    await prisma.titleEvent.create({
      data: {
        titleId,
        message: `${formatLabel} publicado en Instagram (@${integration.instagramUsername || integration.instagramBusinessAccountId}) - ID: ${result.postId}`,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error al publicar en Instagram (${format}) para title ${titleId}:`, errorMsg);

    await prisma.title.update({
      where: { id: titleId },
      data: {
        instagramPublishStatus: "error",
        instagramPublishError: errorMsg,
      },
    });

    await prisma.titleEvent.create({
      data: {
        titleId,
        message: `Publicación en Instagram (${format}) falló: ${errorMsg}`,
      },
    });
  }
}
