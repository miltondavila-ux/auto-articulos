import { prisma } from "@auto-articulos/db";
import {
  buildImagePrompt,
  decryptSecret,
  encryptSecret,
  publishThread,
  refreshThreadsToken,
  publishInstagramCarousel,
  publishInstagramImage,
} from "@auto-articulos/shared";
import { put } from "@vercel/blob";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";

// ─── THREADS ──────────────────────────────────────────────────────────────

async function generateAndHostThreadsImage(titleId: string, summary: string): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  const prompt = buildImagePrompt(summary);
  const models = ["gpt-image-1", "dall-e-3"];
  for (const model of models) {
    try {
      const response = await fetch(OPENAI_IMAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model, prompt, size: "1024x1024", n: 1 }),
      });
      const data = (await response.json()) as { data?: { url?: string; b64_json?: string }[] };
      const imageUrl = data.data?.[0]?.url;
      const b64 = data.data?.[0]?.b64_json;

      if (imageUrl) {
        return imageUrl;
      }

      if (b64) {
        const buffer = Buffer.from(b64, "base64");
        const blob = await put(`threads/${titleId}.png`, buffer, { access: "public", contentType: "image/png" });
        return blob.url;
      }

      continue;
    } catch (err) {
      console.warn(`Fallo al generar imagen para Threads con modelo ${model}:`, err);
    }
  }
  return null;
}

async function processThreadsJob(job: {
  id: string;
  userId: string;
  titleId: string | null;
  articleUrl: string;
  articleTitle: string;
  suggestedText: string;
}): Promise<boolean> {
  const integration = await prisma.threadsIntegration.findUnique({
    where: { userId: job.userId },
  });

  if (!integration) {
    throw new Error("Threads no está configurado en tu cuenta.");
  }

  let accessToken = decryptSecret(integration.accessTokenEncrypted);

  const daysUntilExpiration =
    (integration.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

  if (daysUntilExpiration < 7) {
    const refreshed = await refreshThreadsToken(accessToken);
    accessToken = refreshed.accessToken;
    const newExpiresAt = new Date(Date.now() + refreshed.expiresInSeconds * 1000);
    await prisma.threadsIntegration.update({
      where: { userId: job.userId },
      data: {
        accessTokenEncrypted: encryptSecret(accessToken),
        expiresAt: newExpiresAt,
      },
    });
  }

  let finalPost = job.suggestedText;
  if (finalPost.includes("[ENLACE]")) {
    finalPost = finalPost.replace("[ENLACE]", job.articleUrl);
  } else {
    finalPost = `${finalPost}\n\n${job.articleUrl}`;
  }

  let imageUrl: string | undefined;
  if (job.titleId) {
    const title = await prisma.title.findUnique({ where: { id: job.titleId } });
    if (title?.summary) {
      imageUrl = (await generateAndHostThreadsImage(job.titleId, title.summary)) ?? undefined;
    }
  }

  const result = await publishThread(accessToken, integration.threadsUserId, finalPost, imageUrl);

  await prisma.socialOpportunity.update({
    where: { id: job.id },
    data: {
      status: "published",
      postId: result.permalink || result.postId,
      publishedAt: new Date(),
      errorLog: null,
    },
  });

  console.log(`Publicado en Threads: ${job.id} — postId: ${result.postId}`);

  if (job.titleId) {
    await prisma.titleEvent.create({
      data: {
        titleId: job.titleId,
        message: `Publicado exitosamente en Meta Threads (@${integration.threadsUsername || integration.threadsUserId}) - ID: ${result.postId}${imageUrl ? " (con imagen)" : " (solo texto)"}`,
      },
    });
  }

  return true;
}

// ─── INSTAGRAM ────────────────────────────────────────────────────────────

async function generateInstagramImage(
  titleId: string,
  summary: string,
  format: string,
  index?: number
): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;

  const basePrompt = buildImagePrompt(summary);
  const models = ["gpt-image-1", "dall-e-3"];

  let styleInstruction: string;
  let pathPrefix: string;

  switch (format) {
    case "carousel": {
      const withText = index !== undefined ? index % 2 === 0 : false;
      styleInstruction = withText
        ? `Imagen con texto superpuesto grande y llamativo. Fondo visual moderno, colores vibrantes, con una frase clave o tip escrita directamente en la imagen en tipografía grande y audaz. Diseño tipo slide informativo para redes sociales.`
        : `Imagen sin texto, solo visual. Fotografía o ilustración de alta calidad, colores vibrantes, composición profesional. Sin ningún texto superpuesto. Diseñado para redes sociales.`;
      pathPrefix = `instagram/carousel/${titleId}`;
      break;
    }
    case "reel-image":
      styleInstruction = `Formato vertical 9:16 tipo portada de Instagram Reel. Texto grande y llamativo superpuesto, fondo degradado con colores profesionales, tipografía moderna. Diseñado para detener el scroll.`;
      pathPrefix = `instagram/reel-image/${titleId}`;
      break;
    case "infografia":
      styleInstruction = `Estilo infografía profesional con datos, números, iconos y gráficos minimalistas. Fondo claro con acentos de color. Diseño informativo y fácil de leer.`;
      pathPrefix = `instagram/infografia/${titleId}`;
      break;
    default:
      return null;
  }

  for (const model of models) {
    try {
      const prompt = `${basePrompt}\n\n${styleInstruction}`;
      const variation = index !== undefined ? ` -- Variación ${index + 1}` : "";

      const response = await fetch(OPENAI_IMAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model, prompt: prompt + variation, size: "1024x1024", n: 1 }),
      });
      const data = (await response.json()) as { data?: { url?: string; b64_json?: string }[] };
      const imageUrl = data.data?.[0]?.url;
      const b64 = data.data?.[0]?.b64_json;

      if (imageUrl) {
        return imageUrl;
      }

      if (b64) {
        const buffer = Buffer.from(b64, "base64");
        const filename = index !== undefined ? `${index}.png` : "0.png";
        const blob = await put(`${pathPrefix}/${filename}`, buffer, { access: "public", contentType: "image/png" });
        return blob.url;
      }

      continue;
    } catch (err) {
      console.warn(`Fallo al generar imagen Instagram ${format}/${index} con modelo ${model}:`, err);
    }
  }
  return null;
}

async function processInstagramJob(job: {
  id: string;
  userId: string;
  titleId: string | null;
  articleUrl: string;
  articleTitle: string;
  suggestedText: string;
  platform: string;
}): Promise<boolean> {
  const integration = await prisma.instagramIntegration.findUnique({
    where: { userId: job.userId },
  });

  if (!integration) {
    throw new Error("Instagram no está configurado en tu cuenta.");
  }

  let accessToken = decryptSecret(integration.accessTokenEncrypted);

  if (integration.expiresAt <= new Date()) {
    throw new Error("La autorización de Instagram expiró. Debes volver a conectar la cuenta.");
  }

  const format = job.platform.replace("instagram-", "") as "carousel" | "reel-image" | "infografia";
  const title = job.titleId
    ? await prisma.title.findUnique({ where: { id: job.titleId } })
    : null;
  const summary = title?.summary || job.articleTitle || "";
  const finalPost = job.suggestedText.includes("[ENLACE]")
    ? job.suggestedText.replace("[ENLACE]", job.articleUrl)
    : `${job.suggestedText}\n\n${job.articleUrl}`;

  let result;

  console.log(`[Instagram Publish] user=${job.userId} format=${format} businessAccountId=${integration.instagramBusinessAccountId}`);

  switch (format) {
    case "carousel": {
      const imageUrls: string[] = [];
      for (let i = 0; i < 5; i++) {
        const url = await generateInstagramImage(
          job.titleId || job.id,
          summary,
          "carousel",
          i,
        );
        if (url) imageUrls.push(url);
      }
      console.log(`[Instagram Carousel] generated ${imageUrls.length} images:`, imageUrls.map(u => u.substring(0, 80)));
      if (imageUrls.length < 2) {
        throw new Error(`No se pudieron generar suficientes imágenes para el carrusel (solo ${imageUrls.length}).`);
      }
      result = await publishInstagramCarousel(
        accessToken,
        integration.instagramBusinessAccountId,
        imageUrls,
        finalPost,
      );
      break;
    }

    case "reel-image": {
      const imageUrl = await generateInstagramImage(job.titleId || job.id, summary, "reel-image");
      console.log(`[Instagram Reel-Image] generated image: ${imageUrl?.substring(0, 80)}`);
      if (!imageUrl) throw new Error("No se pudo generar la imagen estilo Reel.");
      result = await publishInstagramImage(
        accessToken,
        integration.instagramBusinessAccountId,
        imageUrl,
        finalPost,
      );
      break;
    }

    case "infografia": {
      const imageUrl = await generateInstagramImage(job.titleId || job.id, summary, "infografia");
      console.log(`[Instagram Infografia] generated image: ${imageUrl?.substring(0, 80)}`);
      if (!imageUrl) throw new Error("No se pudo generar la infografía.");
      result = await publishInstagramImage(
        accessToken,
        integration.instagramBusinessAccountId,
        imageUrl,
        finalPost,
      );
      break;
    }

    default:
      throw new Error(`Formato Instagram desconocido: ${format}`);
  }

  await prisma.socialOpportunity.update({
    where: { id: job.id },
    data: {
      status: "published",
      postId: result.permalink || result.postId,
      publishedAt: new Date(),
      errorLog: null,
    },
  });

  const formatLabel = format === "carousel" ? "Carrusel" : format === "reel-image" ? "Reel-image" : "Infografía";

  console.log(`Publicado en Instagram (${formatLabel}): ${job.id} — postId: ${result.postId}`);

  if (job.titleId) {
    await prisma.titleEvent.create({
      data: {
        titleId: job.titleId,
        message: `${formatLabel} publicado en Instagram (@${integration.instagramUsername || integration.instagramBusinessAccountId}) - ID: ${result.postId}`,
      },
    });
  }

  return true;
}

// ─── PROCESADOR PRINCIPAL ─────────────────────────────────────────────────

export async function processNextSocialPublish(): Promise<boolean> {
  const job = await prisma.socialOpportunity.findFirst({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
  });

  if (!job) return false;

  try {
    const claimed = await prisma.socialOpportunity.updateMany({
      where: { id: job.id, status: "queued" },
      data: { status: "processing" },
    });
    if (claimed.count === 0) return true;

    if (job.platform === "threads") {
      return await processThreadsJob(job);
    } else if (job.platform.startsWith("instagram-")) {
      return await processInstagramJob(job);
    } else {
      throw new Error(`Plataforma no soportada: ${job.platform}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error publicando oportunidad ${job.id} (${job.platform}):`, errorMsg);

    await prisma.socialOpportunity.update({
      where: { id: job.id },
      data: { status: "error", errorLog: errorMsg },
    });

    if (job.titleId) {
      await prisma.titleEvent.create({
        data: {
          titleId: job.titleId,
          message: `Publicación en ${job.platform} falló: ${errorMsg}`,
        },
      });
    }

    return true;
  }
}
