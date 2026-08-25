import { prisma } from "@auto-articulos/db";
import {
  buildImagePrompt,
  decryptSecret,
  encryptSecret,
  publishThread,
  refreshThreadsToken,
  publishTweet,
  refreshTwitterToken,
  publishLinkedInPost,
  uploadLinkedInImage,
  publishInstagramCarousel,
  publishInstagramImage,
  publishInstagramStory,
  generateSocialImageRaw,
  publishFacebookPagePost,
  publishFacebookPageStory,
  createPinterestPin,
  createTumblrPhotoPost,
  createBlueskySession,
  createBlueskyPost,
  getBlueskyPostUrl,
  createMastodonMedia,
  createMastodonStatus,
  createDevToArticle,
  getDevToArticleUrl,
} from "@auto-articulos/shared";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { generateAiSocialImage } from "./aiImageGenerator";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";

async function updateSocialProgress(
  id: string,
  data: { progressPercent: number; progressStage: string; status?: string; startedAt?: Date; finishedAt?: Date },
) {
  await prisma.socialOpportunity.update({ where: { id }, data });
}

async function validateArticleUrl(url: string): Promise<void> {
  if (!url) throw new Error("La oportunidad no tiene URL de artículo.");

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      // Algunos hostings bloquean o frenan pedidos sin User-Agent de
      // navegador (los tratan como bots) — el worker corre desde GitHub
      // Actions sin este header por defecto.
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`La URL del artículo devuelve error ${res.status}. Verifica que el artículo siga publicado en tu blog.`);
  } catch (err) {
    throw new Error(`No se pudo validar la URL del artículo (${url}): ${err instanceof Error ? err.message : String(err)}. Verifica que el artículo siga publicado.`);
  }
}

/**
 * Obtiene la imagen pública que el propio artículo declara para compartirse.
 * No generamos una imagen alternativa para LinkedIn: así la publicación usa
 * exactamente la imagen destacada/OG del artículo, igual que su vista previa.
 */
export async function getArticleOpenGraphImage(articleUrl: string): Promise<string | null> {
  try {
    const res = await fetch(articleUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) return null;

    const html = await res.text();
    const match = html.match(
      /<meta\s+[^>]*(?:property|name)=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    ) ?? html.match(
      /<meta\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["'][^>]*>/i,
    );
    if (!match?.[1]) return null;

    return new URL(match[1].replace(/&amp;/g, "&"), res.url).toString();
  } catch (error) {
    console.warn("No se pudo obtener og:image del artículo para LinkedIn:", error);
    return null;
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function deriveDevToTags(title: string, summary: string, category: string | null): string[] {
  const stopWords = new Set(["para", "como", "qué", "que", "una", "uno", "los", "las", "del", "con", "por", "sobre", "desde", "este", "esta", "sus", "más", "cómo"]);
  const values = [category || "", title, summary].join(" ")
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((word: string) => word.length >= 4 && !stopWords.has(word));
  return Array.from(new Set(values)).slice(0, 4);
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

function extractDivByClass(html: string, className: string): string | null {
  const opening = new RegExp(`<div\\b[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>`, "i").exec(html);
  if (!opening) return null;
  const bodyStart = opening.index + opening[0].length;
  const tags = /<\/?div\b[^>]*>/gi;
  tags.lastIndex = bodyStart;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = tags.exec(html))) {
    if (/^<\s*\/div/i.test(match[0])) depth -= 1;
    else depth += 1;
    if (depth === 0) return html.slice(bodyStart, match.index);
  }
  return null;
}

function extractDivById(html: string, id: string): string | null {
  const opening = new RegExp(`<div\\b[^>]*id=["']${id}["'][^>]*>`, "i").exec(html);
  if (!opening) return null;
  const bodyStart = opening.index + opening[0].length;
  const tags = /<\/?div\b[^>]*>/gi;
  tags.lastIndex = bodyStart;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = tags.exec(html))) {
    if (/^<\s*\/div/i.test(match[0])) depth -= 1;
    else depth += 1;
    if (depth === 0) return html.slice(bodyStart, match.index);
  }
  return null;
}

/** Lee el cuerpo real del artículo publicado y lo adapta al Markdown de DEV.to. */
export async function getArticleBodyMarkdown(articleUrl: string): Promise<string> {
  const response = await fetch(articleUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AutoArticulos/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) throw new Error(`No se pudo leer el contenido del artículo (${response.status}).`);
  const html = await response.text();
  const container = extractDivByClass(html, "crayons-article__body")
    || extractDivById(html, "seo-readmore-container")
    || html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]
    || html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]
    || html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]
    || html;
  let markdown = container
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|nav|header|footer|aside|form)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    // El sitio de origen inyecta bloques de navegación, redes y enlaces
    // relacionados dentro del article. No forman parte del contenido editorial.
    .replace(/<h4\b[^>]*>[\s\S]*?Tambi[ée]n podr[íi]a gustarte[\s\S]*$/i, "")
    .replace(/<h2\b[^>]*>[\s\S]*?TU PR[ÓO]XIMO GRAN PASO[\s\S]*$/i, "")
    // Son separadores vacíos que el sitio original usa para sus componentes.
    .replace(/<p>\s*-\s*<\/p>/gi, "")
    .replace(/<div\b[^>]*id=["']seo-readmore-fade["'][^>]*>[\s\S]*?<\/div>/gi, "")
    // El generador original dejó una etiqueta HTML visible como bloque de código.
    // Quitamos solamente el bloque <pre>, sin cortar el contenido que viene después.
    .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, "")
    .replace(/Enter fullscreen mode|Exit fullscreen mode/gi, "")
    // DEV.to ya muestra el título arriba; no lo repetimos en el cuerpo.
    .replace(/<h1\b[^>]*>[\s\S]*?<\/h1>\s*<p\b[^>]*>\s*Seguros de Salud y Vida\s*<\/p>\s*<p\b[^>]*>\s*[ÚU]ltima actualizaci[óo]n:[\s\S]*?<\/p>/i, "")
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_match, level: string, content: string) => `\n\n${"#".repeat(Number(level))} ${stripHtml(content)}\n\n`)
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_match, href: string, content: string) => {
      const label = stripHtml(content);
      return label ? `[${label}](${decodeHtmlEntities(href)})` : "";
    })
    .replace(/<img\b[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*\/?>/gi, (_match, alt: string, src: string) => `![${decodeHtmlEntities(alt)}](${decodeHtmlEntities(src)})`)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_match, content: string) => `\n- ${stripHtml(content)}\n`)
    .replace(/<\/(p|div|section|blockquote|ul|ol|figure)>/gi, "\n\n")
    .replace(/<(p|div|section|blockquote|ul|ol|figure)\b[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");
 markdown = decodeHtmlEntities(markdown).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  markdown = decodeHtmlEntities(markdown)
    // Nunca enviar cajas de código provenientes del HTML del sitio de origen.
    .replace(/```[\s\S]*?```/g, "")
    // Ni los separadores vacíos que el editor original deja como guiones.
    .replace(/^\s*-\s*$/gm, "")
    // Eliminar widgets/pie de página que el sitio inserta después del artículo.
    .replace(/\n(?:Más sobre nuestros servicios|Tambi[ée]n podr[íi]a gustarte|TU PR[ÓO]XIMO GRAN PASO)\b[\s\S]*$/i, "")
    .replace(/\nSeguros de Salud y Vida\nSeguros de Salud y Vida es una firma[\s\S]*$/i, "")
    // "Whatsapp" queda como texto suelto cuando el botón no tiene etiqueta.
    .replace(/^Whatsapp\s*$/gim, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (markdown.length < 80) throw new Error("El artículo publicado no devolvió un cuerpo de contenido válido.");
  return markdown;
}

/** Quita barras negras incorporadas en la imagen OG antes de subirla a redes. */
async function normalizeSocialImage(imageUrl: string, targetAspect = 3 / 4): Promise<string> {
  try {
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return imageUrl;
    const source = Buffer.from(await response.arrayBuffer());
    const image = sharp(source);
    const metadata = await image.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    let normalized = source;
    if (width > 0 && height > 0) {
      const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
      const channels = info.channels;
      const rowIsDark = (row: number) => {
        let luminance = 0;
        for (let x = 0; x < width; x++) {
          const offset = (row * width + x) * channels;
          luminance += 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];
        }
        return luminance / width < 48;
      };
      const columnIsDark = (column: number) => {
        let luminance = 0;
        for (let y = 0; y < height; y++) {
          const offset = (y * width + column) * channels;
          luminance += 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];
        }
        return luminance / height < 48;
      };
      let top = 0;
      let bottom = height - 1;
      let left = 0;
      let right = width - 1;
      while (top < height * 0.25 && rowIsDark(top)) top++;
      while (bottom > height * 0.75 && rowIsDark(bottom)) bottom--;
      while (left < width * 0.25 && columnIsDark(left)) left++;
      while (right > width * 0.75 && columnIsDark(right)) right--;
      const trimmedHeight = bottom - top + 1;
      const trimmedWidth = right - left + 1;
      let cropWidth = trimmedWidth;
      let cropHeight = trimmedHeight;
      if (trimmedWidth / trimmedHeight > targetAspect) {
        cropWidth = Math.max(1, Math.round(trimmedHeight * targetAspect));
      } else {
        cropHeight = Math.max(1, Math.round(trimmedWidth / targetAspect));
      }
      const cropLeft = left + Math.max(0, Math.round((trimmedWidth - cropWidth) / 2));
      const cropTop = top + Math.max(0, Math.round((trimmedHeight - cropHeight) / 2));
      const outputWidth = targetAspect > 1 ? 1200 : targetAspect < 0.65 ? 1080 : 900;
      const outputHeight = targetAspect > 1 ? 900 : targetAspect < 0.65 ? 1920 : 1200;
      normalized = await sharp(source)
        .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
        .resize(outputWidth, outputHeight, { fit: "fill" })
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer();
    }
    const uploaded = await put(`social-normalized/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`, normalized, {
      access: "public",
      addRandomSuffix: false,
      contentType: "image/jpeg",
    });
    return uploaded.url;
  } catch (error) {
    console.warn("No se pudo normalizar la imagen social; se usará la original:", error);
    return imageUrl;
  }
}

// ─── THREADS ──────────────────────────────────────────────────────────────

async function generateAndHostThreadsImage(
  titleId: string,
  summary: string,
  customImagePrompt?: string | null,
  logoUrl?: string | null,
  platform?: string | null,
): Promise<string | null> {
  const shouldIncludeLogo = logoUrl && Math.random() < 0.5;
  const result = await generateSocialImageRaw(summary, customImagePrompt, undefined, shouldIncludeLogo ? logoUrl : null, platform);

  if (!result) return null;

  if (result.url) {
    const response = await fetch(result.url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return null;
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type")?.split(";")[0] || "image/png";
    const extension = contentType === "image/jpeg" ? "jpg" : "png";
    const blob = await put(`threads/${titleId}-${Date.now()}.${extension}`, imageBuffer, {
      access: "public",
      contentType,
    });
    return blob.url;
  }

  if (result.b64) {
    const buffer = Buffer.from(result.b64, "base64");
    const blob = await put(`threads/${titleId}.png`, buffer, { access: "public", contentType: "image/png" });
    return blob.url;
  }

  return null;
}

async function hostThreadsSourceImage(titleId: string, imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    const extension = contentType === "image/png" ? "png" : "jpg";
    const blob = await put(`threads/source-${titleId}-${Date.now()}.${extension}`, Buffer.from(await response.arrayBuffer()), {
      access: "public",
      contentType,
    });
    return blob.url;
  } catch (error) {
    console.warn("No se pudo alojar la imagen OG de respaldo para Threads:", error);
    return null;
  }
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
    try {
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
    } catch {
      console.warn("No se pudo autorrefrescar token de Threads, usando el actual.");
    }
  }

  await validateArticleUrl(job.articleUrl);

  let finalPost = job.suggestedText;
  if (finalPost.includes("[ENLACE]")) {
    finalPost = finalPost.replace("[ENLACE]", job.articleUrl);
  } else {
    finalPost = `${finalPost}\n\n${job.articleUrl}`;
  }

  // Generar imagen como respaldo para propuestas creadas antes de este flujo.
  let imageUrl: string | undefined = undefined;
  if (!imageUrl && job.titleId) {
    const [title, user] = await Promise.all([
      prisma.title.findUnique({ where: { id: job.titleId } }),
      prisma.user.findUnique({ where: { id: job.userId }, select: { imagePrompt: true, businessLogoUrl: true } }),
    ]);
    const imageBasis = title?.summary || job.articleTitle;
    if (imageBasis) {
      imageUrl = (await generateAndHostThreadsImage(job.titleId, imageBasis, user?.imagePrompt, user?.businessLogoUrl, "threads")) ?? undefined;
    }
  }

  // Si la generación de IA falla, usa la imagen pública del artículo como
  // respaldo. Threads no debe quedar sin publicar por una falla secundaria
  // del generador, y Meta necesita una URL pública estable, no la URL OG que
  // pudiera ser temporal o bloquear al worker.
  if (!imageUrl) {
    const articleImage = await getArticleOpenGraphImage(job.articleUrl);
    if (articleImage) {
      imageUrl = (await hostThreadsSourceImage(job.titleId || job.id, articleImage)) ?? undefined;
    }
  }

  if (!imageUrl) {
    // La imagen es preferible, pero nunca debe impedir la publicación del
    // texto: este era el comportamiento funcional anterior de Threads.
    console.warn(`Threads ${job.id}: no se pudo preparar imagen; se publicará solo el texto.`);
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

// ─── X (TWITTER) ───────────────────────────────────────────────────────────

async function processTwitterJob(job: {
  id: string;
  userId: string;
  titleId: string | null;
  articleUrl: string;
  articleTitle: string;
  suggestedText: string;
}): Promise<boolean> {
  const integration = await prisma.twitterIntegration.findUnique({
    where: { userId: job.userId },
  });

  if (!integration) {
    throw new Error("X (Twitter) no está configurado en tu cuenta.");
  }

  let accessToken = decryptSecret(integration.accessTokenEncrypted);
  let refreshToken = decryptSecret(integration.refreshTokenEncrypted);

  const daysUntilExpiration =
    (integration.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

  if (daysUntilExpiration < 7) {
    const refreshed = await refreshTwitterToken(refreshToken);
    accessToken = refreshed.accessToken;
    refreshToken = refreshed.refreshToken;
    const newExpiresAt = new Date(Date.now() + refreshed.expiresInSeconds * 1000);
    await prisma.twitterIntegration.update({
      where: { userId: job.userId },
      data: {
        accessTokenEncrypted: encryptSecret(accessToken),
        refreshTokenEncrypted: encryptSecret(refreshToken),
        expiresAt: newExpiresAt,
      },
    });
  }

  await validateArticleUrl(job.articleUrl);
  let finalPost = job.suggestedText;
  if (finalPost.includes("[ENLACE]")) {
    finalPost = finalPost.replace("[ENLACE]", job.articleUrl);
  } else {
    finalPost = `${finalPost}\n\n${job.articleUrl}`;
  }

  let imageUrl: string | undefined = undefined;
  if (!imageUrl && job.titleId) {
    const [title, user] = await Promise.all([
      prisma.title.findUnique({ where: { id: job.titleId } }),
      prisma.user.findUnique({ where: { id: job.userId }, select: { imagePrompt: true, businessLogoUrl: true } }),
    ]);
    const imageBasis = title?.summary || job.articleTitle;
    if (title?.summary) {
      imageUrl = (await generateAndHostThreadsImage(job.titleId, imageBasis, user?.imagePrompt, user?.businessLogoUrl, "x")) ?? undefined;
    }
  }

  const result = await publishTweet(accessToken, finalPost, imageUrl);

  await prisma.socialOpportunity.update({
    where: { id: job.id },
    data: {
      status: "published",
      postId: result.tweetUrl || result.tweetId,
      publishedAt: new Date(),
      errorLog: null,
    },
  });

  console.log(`Publicado en X (Twitter): ${job.id} — tweetId: ${result.tweetId}`);

  if (job.titleId) {
    await prisma.titleEvent.create({
      data: {
        titleId: job.titleId,
        message: `Publicado exitosamente en X (Twitter) (@${integration.twitterUsername || integration.twitterUserId}) - ID: ${result.tweetId}${imageUrl ? " (con imagen)" : " (solo texto)"}`,
      },
    });
  }

  return true;
}

// ─── LINKEDIN ─────────────────────────────────────────────────────────────

async function processLinkedInJob(job: {
  id: string;
  userId: string;
  titleId: string | null;
  articleUrl: string;
  articleTitle: string;
  suggestedText: string;
}): Promise<boolean> {
  const integration = await prisma.linkedInIntegration.findUnique({
    where: { userId: job.userId },
  });

  if (!integration) {
    throw new Error("LinkedIn no está configurado en tu cuenta.");
  }

  const accessToken = decryptSecret(integration.accessTokenEncrypted);

  // LinkedIn (en el flujo estándar sin aprobación de partner) NO entrega
  // refresh_token — el access token dura 60 días y luego el usuario debe
  // reconectar manualmente desde Configuración. No hay forma de renovarlo
  // en segundo plano, así que fallamos con un mensaje claro en vez de
  // intentar un "refresh" que siempre fallaría.
  if (integration.expiresAt <= new Date()) {
    throw new Error(
      "La autorización de LinkedIn expiró. Debes volver a conectar la cuenta en Configuración."
    );
  }

  await validateArticleUrl(job.articleUrl);
  let finalPost = job.suggestedText;
  if (finalPost.includes("[ENLACE]")) {
    finalPost = finalPost.replace("[ENLACE]", job.articleUrl);
  } else {
    finalPost = `${finalPost}\n\n${job.articleUrl}`;
  }

  // LinkedIn debe reutilizar la imagen destacada del artículo, no crear una
  // imagen con IA. Si el sitio no expone og:image, publicamos como ARTICLE
  // para que LinkedIn resuelva su previsualización nativa del enlace.
  const sourceImage = await getArticleOpenGraphImage(job.articleUrl);
  // LinkedIn muestra el adjunto del feed en un contenedor horizontal 4:3.
  const sourceImageUrl = sourceImage ? await normalizeSocialImage(sourceImage, 4 / 3) : undefined;

  let imageAssetUrn: string | undefined;
  if (sourceImageUrl) {
    imageAssetUrn =
      (await uploadLinkedInImage(accessToken, integration.linkedinUserId, sourceImageUrl)) ?? undefined;
  }

  const result = await publishLinkedInPost(
    accessToken,
    integration.linkedinUserId,
    finalPost,
    job.articleUrl,
    imageAssetUrn,
    job.articleTitle
  );

  await prisma.socialOpportunity.update({
    where: { id: job.id },
    data: {
      status: "published",
      postId: result.postUrl || result.postId,
      publishedAt: new Date(),
      errorLog: null,
    },
  });

  console.log(`Publicado en LinkedIn: ${job.id} — postId: ${result.postId}${imageAssetUrn ? " (con imagen)" : " (solo texto)"}`);

  if (job.titleId) {
    await prisma.titleEvent.create({
      data: {
        titleId: job.titleId,
        message: `Publicado exitosamente en LinkedIn (${integration.linkedinUsername || integration.linkedinUserId}) - ID: ${result.postId}${imageAssetUrn ? " (con imagen)" : " (solo texto)"}`,
      },
    });
  }

  return true;
}

// ─── PINTEREST ─────────────────────────────────────────────────────────────

async function processPinterestJob(job: {
  id: string;
  userId: string;
  titleId: string | null;
  articleUrl: string;
  articleTitle: string;
  suggestedText: string;
}): Promise<boolean> {
  const integration = await prisma.pinterestIntegration.findUnique({ where: { userId: job.userId } });
  if (!integration) throw new Error("Pinterest no está configurado en tu cuenta.");
  if (!integration.boardId) throw new Error("Pinterest está conectado, pero todavía no has seleccionado un tablero.");
  if (integration.expiresAt && integration.expiresAt <= new Date()) {
    throw new Error("La autorización de Pinterest expiró. Debes volver a conectar la cuenta.");
  }

  await validateArticleUrl(job.articleUrl);
  const imageUrl = await getArticleOpenGraphImage(job.articleUrl);
  if (!imageUrl) throw new Error("El artículo no tiene una imagen OG pública para Pinterest.");
  const description = job.suggestedText.includes("[ENLACE]")
    ? job.suggestedText.replace("[ENLACE]", job.articleUrl)
    : `${job.suggestedText}\n\n${job.articleUrl}`;
  const result = await createPinterestPin(decryptSecret(integration.accessTokenEncrypted), {
    boardId: integration.boardId,
    title: job.articleTitle,
    description,
    link: job.articleUrl,
    imageUrl,
  });

  await prisma.socialOpportunity.update({
    where: { id: job.id },
    data: { status: "published", postId: result.link || result.id, publishedAt: new Date(), errorLog: null },
  });
  console.log(`Publicado en Pinterest: ${job.id} — pinId: ${result.id}`);
  if (job.titleId) {
    await prisma.titleEvent.create({
      data: {
        titleId: job.titleId,
        message: `Publicado exitosamente en Pinterest (${integration.boardName || integration.boardId}) - ID: ${result.id}`,
      },
    });
  }
  return true;
}

// ─── TUMBLR ────────────────────────────────────────────────────────────────

async function processTumblrJob(job: {
  id: string;
  userId: string;
  titleId: string | null;
  articleUrl: string;
  articleTitle: string;
  suggestedText: string;
}): Promise<boolean> {
  const integration = await prisma.tumblrIntegration.findUnique({ where: { userId: job.userId } });
  if (!integration) throw new Error("Tumblr no está configurado en tu cuenta.");
  if (integration.expiresAt && integration.expiresAt <= new Date()) throw new Error("La autorización de Tumblr expiró. Debes volver a conectar la cuenta.");
  await validateArticleUrl(job.articleUrl);
  const imageUrl = await getArticleOpenGraphImage(job.articleUrl);
  if (!imageUrl) throw new Error("El artículo no tiene una imagen OG pública para Tumblr.");
  const caption = job.suggestedText.includes("[ENLACE]") ? job.suggestedText.replace("[ENLACE]", "") : job.suggestedText;
  const result = await createTumblrPhotoPost(decryptSecret(integration.accessTokenEncrypted), integration.blogIdentifier, { caption, link: job.articleUrl, imageUrl });
  const postId = String(result.response?.id || "");
  const returnedUrl = result.response?.post_url || "";
  const returnedPostMatch = returnedUrl.match(/\/post\/(\d+)(?:\/([^/?#]+))?/i);
  const postUrl = returnedPostMatch
    ? `https://www.tumblr.com/${integration.blogIdentifier}/${returnedPostMatch[1]}${returnedPostMatch[2] ? `/${returnedPostMatch[2]}` : ""}`
    : (postId ? `https://www.tumblr.com/${integration.blogIdentifier}/${postId}` : null);
  await prisma.socialOpportunity.update({ where: { id: job.id }, data: { status: "published", postId: postUrl || postId, publishedAt: new Date(), errorLog: null } });
  console.log(`Publicado en Tumblr: ${job.id} — postId: ${postId}`);
  if (job.titleId) await prisma.titleEvent.create({ data: { titleId: job.titleId, message: `Publicado exitosamente en Tumblr (${integration.blogTitle || integration.blogIdentifier}) - ID: ${postId}` } });
  return true;
}

// ─── BLUESKY ───────────────────────────────────────────────────────────────

async function processBlueskyJob(job: {
  id: string; userId: string; titleId: string | null; articleUrl: string; articleTitle: string; suggestedText: string;
}): Promise<boolean> {
  const integration = await prisma.blueskyIntegration.findUnique({ where: { userId: job.userId } });
  if (!integration) throw new Error("Bluesky no está configurado en tu cuenta.");
  await validateArticleUrl(job.articleUrl);
  const text = job.suggestedText.includes("[ENLACE]") ? job.suggestedText.replace("[ENLACE]", job.articleUrl) : `${job.suggestedText}\n\n${job.articleUrl}`;
  const imageUrl = await getArticleOpenGraphImage(job.articleUrl);
  const session = await createBlueskySession(integration.handle, decryptSecret(integration.encryptedAppPassword));
  const result = await createBlueskyPost(session, text, imageUrl);
  const rkey = result.uri.split("/").pop() || result.cid;
  const postUrl = getBlueskyPostUrl(session.handle || integration.handle, rkey);
  await prisma.socialOpportunity.update({ where: { id: job.id }, data: { status: "published", postId: postUrl, publishedAt: new Date(), errorLog: null } });
  if (job.titleId) await prisma.titleEvent.create({ data: { titleId: job.titleId, message: `Publicado exitosamente en Bluesky (@${session.handle || integration.handle})${imageUrl ? " (con imagen)" : ""}.` } });
  return true;
}

// ─── MASTODON ─────────────────────────────────────────────────────────────

async function processMastodonJob(job: { id: string; userId: string; titleId: string | null; articleUrl: string; articleTitle: string; suggestedText: string }): Promise<boolean> {
  const integration = await prisma.mastodonIntegration.findUnique({ where: { userId: job.userId } });
  if (!integration) throw new Error("Mastodon no está configurado en tu cuenta.");
  await validateArticleUrl(job.articleUrl);
  const imageUrl = await getArticleOpenGraphImage(job.articleUrl);
  const token = decryptSecret(integration.accessTokenEncrypted);
  const text = job.suggestedText.includes("[ENLACE]") ? job.suggestedText.replace("[ENLACE]", job.articleUrl) : `${job.suggestedText}\n\n${job.articleUrl}`;
  let mediaId: string | undefined;
  if (imageUrl) {
    const image = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (image.ok) mediaId = (await createMastodonMedia(integration.instanceUrl, token, new Uint8Array(await image.arrayBuffer()), image.headers.get("content-type") || "image/jpeg", job.articleTitle)).id;
  }
  const result = await createMastodonStatus(integration.instanceUrl, token, text, mediaId);
  const postUrl = result.url || result.uri || `${integration.instanceUrl}/@${integration.username}/${result.id}`;
  await prisma.socialOpportunity.update({ where: { id: job.id }, data: { status: "published", postId: postUrl, publishedAt: new Date(), errorLog: null } });
  if (job.titleId) await prisma.titleEvent.create({ data: { titleId: job.titleId, message: `Publicado exitosamente en Mastodon (@${integration.username || "cuenta"}).` } });
  return true;
}

// ─── DEV.TO ───────────────────────────────────────────────────────────────

async function processDevToJob(job: {
  id: string; userId: string; titleId: string | null; articleUrl: string; articleTitle: string; suggestedText: string;
}): Promise<boolean> {
  const integration = await prisma.devToIntegration.findUnique({ where: { userId: job.userId } });
  if (!integration) throw new Error("DEV.to no está configurado en tu cuenta.");
  await validateArticleUrl(job.articleUrl);
  const title = job.titleId ? await prisma.title.findUnique({ where: { id: job.titleId }, select: { summary: true, finalTitle: true, run: { select: { category: { select: { name: true } } } } } }) : null;
  const articleTitle = title?.finalTitle || job.articleTitle;
  const articleSummary = title?.summary || job.articleTitle;
  const bodyMarkdown = await getArticleBodyMarkdown(job.articleUrl);
  const imageUrl = await getArticleOpenGraphImage(job.articleUrl);
  const result = await createDevToArticle(decryptSecret(integration.encryptedApiKey), {
    title: articleTitle,
    bodyMarkdown,
    canonicalUrl: job.articleUrl,
    description: articleSummary,
    mainImage: imageUrl,
    tags: deriveDevToTags(articleTitle, articleSummary, title?.run.category.name || null),
    series: title?.run.category.name || null,
  });
  const postUrl = getDevToArticleUrl(result);
  if (!postUrl) throw new Error("DEV.to no devolvió la URL del artículo publicado.");
  await prisma.socialOpportunity.update({ where: { id: job.id }, data: { status: "published", postId: postUrl, publishedAt: new Date(), errorLog: null } });
  if (job.titleId) await prisma.titleEvent.create({ data: { titleId: job.titleId, message: `Artículo adaptado publicado exitosamente en DEV.to${imageUrl ? " (con imagen y canonical URL)" : " (con canonical URL)"}.` } });
  return true;
}

// ─── FACEBOOK PAGES ───────────────────────────────────────────────────────

async function processFacebookPageJob(job: {
  id: string; userId: string; titleId: string | null; articleUrl: string; articleTitle: string; suggestedText: string;
}): Promise<boolean> {
  const integration = await prisma.facebookPageIntegration.findUnique({ where: { userId: job.userId } });
  if (!integration) throw new Error("Facebook Pages no está configurado en tu cuenta.");
  if (integration.expiresAt <= new Date()) throw new Error("La autorización de Facebook Pages expiró. Vuelve a conectar Meta en Configuración.");

  await validateArticleUrl(job.articleUrl);
  const finalPost = job.suggestedText.includes("[ENLACE]")
    ? job.suggestedText.replace("[ENLACE]", job.articleUrl)
    : `${job.suggestedText}\n\n${job.articleUrl}`;
  const articleImage = await getArticleOpenGraphImage(job.articleUrl);
  const imageUrl = articleImage ? await normalizeSocialImage(articleImage, 4 / 3) : undefined;
  const result = await publishFacebookPagePost(
    decryptSecret(integration.accessTokenEncrypted), integration.facebookPageId, finalPost, imageUrl,
  );

  await prisma.socialOpportunity.update({ where: { id: job.id }, data: { status: "published", postId: result.permalink || result.postId, publishedAt: new Date(), errorLog: null } });
  if (job.titleId) await prisma.titleEvent.create({ data: { titleId: job.titleId, message: `Publicado en Facebook Page (${integration.facebookPageName || integration.facebookPageId}) - ID: ${result.postId}${imageUrl ? " (con imagen del artículo)" : ""}` } });
  return true;
}

/**
 * Historia (Story) estática de Facebook Page (20/8/2026, pedido de
 * Milton). Mismo patrón OG-vs-IA que Instagram Story: opción 1 (OG tal
 * cual, default) u opción 2 (generador IA) según aiImageGenerationEnabled.
 * La API de Historias de Facebook no acepta caption — igual que Instagram
 * Story, el texto de la oportunidad no se usa para publicar, solo la
 * imagen.
 */
async function processFacebookStoryJob(job: {
  id: string; userId: string; titleId: string | null; articleUrl: string; articleTitle: string; suggestedText: string;
}): Promise<boolean> {
  const integration = await prisma.facebookPageIntegration.findUnique({ where: { userId: job.userId } });
  if (!integration) throw new Error("Facebook Pages no está configurado en tu cuenta.");
  if (integration.expiresAt <= new Date()) throw new Error("La autorización de Facebook Pages expiró. Vuelve a conectar Meta en Configuración.");

  await validateArticleUrl(job.articleUrl);

  const [title, user] = await Promise.all([
    job.titleId ? prisma.title.findUnique({ where: { id: job.titleId } }) : Promise.resolve(null),
    prisma.user.findUnique({
      where: { id: job.userId },
      select: { aiImageGenerationEnabled: true, businessLogoUrl: true, profilePhotoUrl: true },
    }),
  ]);
  const summary = title?.summary || job.articleTitle || "";

  const sourceImage = await getArticleOpenGraphImage(job.articleUrl);
  let imageUrl: string | null = null;
  let aiPrompt: string | null = null;
  if (sourceImage && user?.aiImageGenerationEnabled) {
    const generated = await generateAiSocialImage({
      articleTitle: job.articleTitle,
      articleSummary: summary,
      ogImageUrl: sourceImage,
      format: "facebook-story",
      businessLogoUrl: user.businessLogoUrl,
      profilePhotoUrl: user.profilePhotoUrl,
      pathPrefix: `facebook/ai/story/${job.titleId || job.id}`,
    });
    imageUrl = generated?.imageUrl ?? null;
    aiPrompt = generated?.prompt ?? null;
    if (!imageUrl) throw new Error("No se pudo generar la imagen con IA para la Historia de Facebook.");
  } else {
    imageUrl = sourceImage ? await normalizeSocialImage(sourceImage, 9 / 16) : null;
    if (!imageUrl) throw new Error("No se pudo adaptar la imagen del artículo para la Historia de Facebook.");
  }

  const result = await publishFacebookPageStory(
    decryptSecret(integration.accessTokenEncrypted), integration.facebookPageId, imageUrl,
  );

  await prisma.socialOpportunity.update({ where: { id: job.id }, data: { status: "published", postId: result.permalink || result.postId, publishedAt: new Date(), errorLog: null, imageUrl, aiImagePrompt: aiPrompt } });
  if (job.titleId) await prisma.titleEvent.create({ data: { titleId: job.titleId, message: `Historia publicada en Facebook Page (${integration.facebookPageName || integration.facebookPageId}) - ID: ${result.postId}` } });
  return true;
}

// ─── INSTAGRAM ────────────────────────────────────────────────────────────

async function generateInstagramImage(
  titleId: string,
  summary: string,
  format: string,
  index?: number,
  customImagePrompt?: string | null,
  customInfographicPrompt?: string | null,
): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;

  const basePrompt = buildImagePrompt(summary, customImagePrompt);
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
      styleInstruction = (customInfographicPrompt && customInfographicPrompt.trim())
        || `Estilo infografía profesional con datos, números, iconos y gráficos minimalistas. Fondo claro con acentos de color. Diseño informativo y fácil de leer.`;
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
        body: JSON.stringify({ model, prompt: prompt + variation, size: "1024x1024", n: 1, response_format: "b64_json" }),
      });
      const data = (await response.json()) as { data?: { url?: string; b64_json?: string }[] };
      const b64 = data.data?.[0]?.b64_json;

      if (!b64) {
        console.warn(`[Instagram Image] Modelo ${model} no devolvió b64_json`);
        continue;
      }

      const buffer = Buffer.from(b64, "base64");
      const filename = index !== undefined ? `${index}.png` : "0.png";
      const blob = await put(`${pathPrefix}/${filename}`, buffer, {
        access: "public",
        contentType: "image/png",
        addRandomSuffix: false,
      });

      console.log(`[Instagram Image] Subida a Vercel Blob: ${blob.url.substring(0, 100)}`);

      // Verificar que la URL sea accesible
      const checkRes = await fetch(blob.url, { method: "HEAD" });
      if (!checkRes.ok) {
        console.warn(`[Instagram Image] URL no accesible: ${blob.url} status=${checkRes.status}`);
        continue;
      }

      return blob.url;
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

  await validateArticleUrl(job.articleUrl);

  const format = job.platform.replace("instagram-", "") as "carousel" | "reel-image" | "story" | "infografia" | "post";
  const [title, user] = await Promise.all([
    job.titleId ? prisma.title.findUnique({ where: { id: job.titleId } }) : Promise.resolve(null),
    prisma.user.findUnique({
      where: { id: job.userId },
      select: {
        imagePrompt: true,
        infographicPrompt: true,
        aiImageGenerationEnabled: true,
        businessLogoUrl: true,
        profilePhotoUrl: true,
      },
    }),
  ]);
  const summary = title?.summary || job.articleTitle || "";
  // Instagram no vuelve clicable ninguna URL dentro del caption — para
  // post/reel-image/carousel/infografia el texto ya trae hashtags en vez de
  // enlace (generate/route.ts), así que NO se le pega la URL cruda al final
  // como con las demás redes (pedido explícito de Milton, 20/8/2026).
  // "story" no tiene caption visible en Instagram, da igual — se deja como
  // estaba por si algún registro viejo aún trae [ENLACE].
  const finalPost = job.suggestedText.includes("[ENLACE]")
    ? job.suggestedText.replace("[ENLACE]", job.articleUrl)
    : format === "story"
    ? `${job.suggestedText}\n\n${job.articleUrl}`
    : job.suggestedText;

  let result;
  // Pedido explícito de Milton (22/8/2026): guardar la imagen y el prompt
  // exacto usados para que aparezcan en el histórico, sin tener que
  // reconstruirlos desde los logs de GitHub Actions cada vez.
  let publishedImageUrl: string | null = null;
  let publishedAiPrompt: string | null = null;

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
          user?.imagePrompt,
          user?.infographicPrompt,
        );
        if (url) imageUrls.push(url);
      }
      console.log(`[Instagram Carousel] generated ${imageUrls.length} images:`, imageUrls.map(u => u.substring(0, 80)));
      if (imageUrls.length < 2) {
        throw new Error(`No se pudieron generar suficientes imágenes para el carrusel (solo ${imageUrls.length}).`);
      }
      publishedImageUrl = imageUrls[0];
      result = await publishInstagramCarousel(
        accessToken,
        integration.instagramBusinessAccountId,
        imageUrls,
        finalPost,
      );
      break;
    }

    case "reel-image": {
      const sourceImage = await getArticleOpenGraphImage(job.articleUrl);
      const wasAiGenerated = Boolean(sourceImage && user?.aiImageGenerationEnabled);
      let imageUrl: string | null = null;
      if (sourceImage && user?.aiImageGenerationEnabled) {
        // Opción 2 del "Creador de Imágenes para Redes Sociales": generador
        // IA aparte, partiendo de la OG. Sin fallback a la OG sin tocar si
        // falla — se cancela la oportunidad (regla explícita, por costo).
        const generated = await generateAiSocialImage({
          articleTitle: job.articleTitle,
          articleSummary: summary,
          ogImageUrl: sourceImage,
          format: "reel-image",
          businessLogoUrl: user.businessLogoUrl,
          profilePhotoUrl: user.profilePhotoUrl,
          pathPrefix: `instagram/ai/reel-image/${job.titleId || job.id}`,
        });
        imageUrl = generated?.imageUrl ?? null;
        publishedAiPrompt = generated?.prompt ?? null;
        console.log(`[Instagram ${format}] AI image: ${imageUrl?.substring(0, 80)}`);
        if (!imageUrl) throw new Error("No se pudo generar la imagen con IA para Reel.");
      } else {
        // Opción 1 (default, sin cambios): imagen OG tal cual.
        imageUrl = sourceImage ? await normalizeSocialImage(sourceImage, 9 / 16) : null;
        console.log(`[Instagram ${format}] adapted article image: ${imageUrl?.substring(0, 80)}`);
        if (!imageUrl) throw new Error("No se pudo generar la imagen estilo Reel.");
      }
      publishedImageUrl = imageUrl;
      result = await publishInstagramImage(
        accessToken,
        integration.instagramBusinessAccountId,
        imageUrl,
        finalPost,
        wasAiGenerated,
      );
      break;
    }

    case "story": {
      const sourceImage = await getArticleOpenGraphImage(job.articleUrl);
      const wasAiGenerated = Boolean(sourceImage && user?.aiImageGenerationEnabled);
      let imageUrl: string | null = null;
      if (sourceImage && user?.aiImageGenerationEnabled) {
        const generated = await generateAiSocialImage({
          articleTitle: job.articleTitle,
          articleSummary: summary,
          ogImageUrl: sourceImage,
          format: "story",
          businessLogoUrl: user.businessLogoUrl,
          profilePhotoUrl: user.profilePhotoUrl,
          pathPrefix: `instagram/ai/story/${job.titleId || job.id}`,
        });
        imageUrl = generated?.imageUrl ?? null;
        publishedAiPrompt = generated?.prompt ?? null;
        if (!imageUrl) throw new Error("No se pudo generar la imagen con IA para Stories.");
      } else {
        imageUrl = sourceImage ? await normalizeSocialImage(sourceImage, 9 / 16) : null;
        if (!imageUrl) throw new Error("No se pudo adaptar la imagen del artículo para Stories.");
      }
      publishedImageUrl = imageUrl;
      result = await publishInstagramStory(
        accessToken,
        integration.instagramBusinessAccountId,
        imageUrl,
        wasAiGenerated,
      );
      break;
    }

    case "post": {
      // Post normal de feed (20/8/2026, pedido de Milton): igual patrón que
      // Story/Reel-image — opción 1 (OG tal cual, default) u opción 2
      // (generador IA) según aiImageGenerationEnabled. 4:5 vertical, el
      // formato de feed que más espacio ocupa en pantalla hoy en Instagram.
      const sourceImage = await getArticleOpenGraphImage(job.articleUrl);
      const wasAiGenerated = Boolean(sourceImage && user?.aiImageGenerationEnabled);
      let imageUrl: string | null = null;
      if (sourceImage && user?.aiImageGenerationEnabled) {
        const generated = await generateAiSocialImage({
          articleTitle: job.articleTitle,
          articleSummary: summary,
          ogImageUrl: sourceImage,
          format: "post",
          businessLogoUrl: user.businessLogoUrl,
          profilePhotoUrl: user.profilePhotoUrl,
          pathPrefix: `instagram/ai/post/${job.titleId || job.id}`,
        });
        imageUrl = generated?.imageUrl ?? null;
        publishedAiPrompt = generated?.prompt ?? null;
        if (!imageUrl) throw new Error("No se pudo generar la imagen con IA para el post.");
      } else {
        imageUrl = sourceImage ? await normalizeSocialImage(sourceImage, 4 / 5) : null;
        if (!imageUrl) throw new Error("No se pudo adaptar la imagen del artículo para el post.");
      }
      publishedImageUrl = imageUrl;
      result = await publishInstagramImage(
        accessToken,
        integration.instagramBusinessAccountId,
        imageUrl,
        finalPost,
        wasAiGenerated,
      );
      break;
    }

    case "infografia": {
      const imageUrl = await generateInstagramImage(job.titleId || job.id, summary, "infografia", undefined, user?.imagePrompt, user?.infographicPrompt);
      console.log(`[Instagram Infografia] generated image: ${imageUrl?.substring(0, 80)}`);
      if (!imageUrl) throw new Error("No se pudo generar la infografía.");
      publishedImageUrl = imageUrl;
      // La infografía no tiene camino sin IA — siempre se genera con IA.
      result = await publishInstagramImage(
        accessToken,
        integration.instagramBusinessAccountId,
        imageUrl,
        finalPost,
        true,
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
      imageUrl: publishedImageUrl,
      aiImagePrompt: publishedAiPrompt,
    },
  });

  // Bug preexistente (no de hoy) encontrado en auditoría 22/8/2026: solo
  // distinguía "Carrusel"/"Reel-image", cualquier otro formato (incluidos
  // "story" y "post") se etiquetaba "Infografía" en el log, aunque el
  // postId/estado guardados siempre fueron correctos.
  const formatLabel =
    format === "carousel"
      ? "Carrusel"
      : format === "reel-image"
        ? "Reel-image"
        : format === "story"
          ? "Story"
          : format === "post"
            ? "Post"
            : "Infografía";

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

export async function processNextSocialPublish(filterUserId?: string, filterArticleUrl?: string): Promise<boolean> {
  const job = await prisma.socialOpportunity.findFirst({
    where: {
      status: "queued",
      ...(filterUserId ? { userId: filterUserId } : {}),
      ...(filterArticleUrl ? { articleUrl: filterArticleUrl } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  if (!job) return false;

  try {
    const claimed = await prisma.socialOpportunity.updateMany({
      where: { id: job.id, status: "queued" },
      data: {
        status: "processing",
        progressPercent: 10,
        progressStage: "Preparando la publicación",
        startedAt: new Date(),
        finishedAt: null,
      },
    });
    if (claimed.count === 0) return true;

    await updateSocialProgress(job.id, {
      progressPercent: 25,
      progressStage: "Validando el artículo y sus datos",
    });

    await updateSocialProgress(job.id, {
      progressPercent: 55,
      progressStage: "Preparando contenido e imagen",
    });

    let published = false;
    await updateSocialProgress(job.id, {
      progressPercent: 75,
      progressStage: `Enviando publicación a ${job.platform}`,
    });

    if (job.platform === "threads") {
      published = await processThreadsJob(job);
    } else if (job.platform === "x") {
      published = await processTwitterJob(job);
    } else if (job.platform === "linkedin") {
      published = await processLinkedInJob(job);
    } else if (job.platform === "pinterest") {
      published = await processPinterestJob(job);
    } else if (job.platform === "tumblr") {
      published = await processTumblrJob(job);
    } else if (job.platform === "bluesky") {
      published = await processBlueskyJob(job);
    } else if (job.platform === "mastodon") {
      published = await processMastodonJob(job);
    } else if (job.platform === "devto") {
      published = await processDevToJob(job);
    } else if (job.platform === "facebook-page") {
      published = await processFacebookPageJob(job);
    } else if (job.platform === "facebook-story") {
      published = await processFacebookStoryJob(job);
    } else if (job.platform.startsWith("instagram-")) {
      published = await processInstagramJob(job);
    } else {
      throw new Error(`Plataforma no soportada: ${job.platform}`);
    }

    if (published) {
      await updateSocialProgress(job.id, {
        progressPercent: 100,
        progressStage: "Publicación confirmada",
        finishedAt: new Date(),
      });
    }
    return published;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error publicando oportunidad ${job.id} (${job.platform}):`, errorMsg);

    await prisma.socialOpportunity.update({
      where: { id: job.id },
      data: {
        status: "error",
        errorLog: errorMsg,
        progressStage: "La publicación terminó con error",
        finishedAt: new Date(),
      },
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
