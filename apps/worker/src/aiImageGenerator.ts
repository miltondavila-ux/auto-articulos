// Generador de imágenes con IA para redes sociales ("Creador de Imágenes
// para Redes Sociales", 20/8/2026). Es un generador APARTE de los que ya
// existían (socialPublish.ts, businessProfilePublish.ts) — no los toca ni
// los reemplaza, por decisión explícita de Milton.
//
// El prompt del director creativo lo edita Milton desde el panel de admin
// (pestaña "Prompts", ver getCustomSystemPrompt más abajo) y CONTROLA de
// verdad la imagen final: el propio modelo de decisión arma la instrucción
// visual que se usa para editar la imagen (campo "visualPrompt"), siguiendo
// la metodología que Milton describe en su prompt — no una traducción fija
// de etiquetas hardcodeadas en este archivo. Antes (20/8/2026, primera
// versión) el prompt de Milton solo influía una decisión intermedia y el
// texto real que recibía el generador de imagen lo armaba este código por
// completo, ignorándolo — Milton lo notó y pidió la corrección.
//
// La imagen OG se le pasa DIRECTO a la IA como materia prima principal (no
// hace falta describirla en texto). Una sola generación por oportunidad: si
// algo falla en cualquier paso, devuelve null y quien llama debe cancelar la
// oportunidad — no hay reintento ni regeneración gratuita (decisión
// explícita, por costo).
//
// Usa una API key de OpenAI SEPARADA (OPENAI_IMAGE_API_KEY) de la que ya
// usa el resto de la plataforma. Modelo gpt-image-1-mini + calidad "medium"
// explícita (pedido de Milton por costo, 20/8/2026): ~$0.015/imagen en vez
// de hasta $0.25.

import sharp from "sharp";
import { put } from "@vercel/blob";
import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";

const OPENAI_IMAGE_API_KEY = process.env.OPENAI_IMAGE_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_EDIT_URL = "https://api.openai.com/v1/images/edits";

export type AiImageFormat = "story" | "reel-image" | "post";

// Tamaño que se le pide a gpt-image-1-mini (solo soporta 1024x1024,
// 1024x1536, 1536x1024) y tamaño final real al que se recorta después con
// sharp. "post" usa 4:5 (1080x1350), el formato de feed que más espacio
// ocupa en pantalla — recomendado hoy por Instagram. Cuando este módulo
// cubra más redes, este mapa crece.
const FORMAT_TARGET: Record<AiImageFormat, { editSize: "1024x1536"; width: number; height: number }> = {
  story: { editSize: "1024x1536", width: 1080, height: 1920 },
  "reel-image": { editSize: "1024x1536", width: 1080, height: 1920 },
  post: { editSize: "1024x1536", width: 1080, height: 1350 },
};

const FORMAT_LABEL: Record<AiImageFormat, string> = {
  story: "Instagram Story",
  "reel-image": "Instagram Reel cover",
  post: "Instagram feed post",
};

interface CreativeDecision {
  message: string;
  hasPeople: boolean;
  visualPrompt: string;
  tagString: string;
}

// Mismo key que apps/web/src/lib/ai-image-prompt.ts — Milton pidió (20/8/2026)
// poder editar el prompt del director creativo desde el panel de admin
// (pestaña "Prompts") sin depender de un redeploy de código. Guardado
// global (no por usuario) en SystemSetting, igual que otras settings
// globales del sistema.
const AI_IMAGE_PROMPT_KEY = "ai_social_image_prompt";

const DEFAULT_SYSTEM_PROMPT =
  "Eres un Director Creativo Senior de publicaciones para redes sociales. Ves una foto real y un artículo. El artículo es el cerebro conceptual (busca la necesidad humana detrás del tema, no la lectura superficial); la foto ya contiene toda la información visual, no hace falta describirla. La imagen OG es la materia prima principal: no se recrea desde cero lo que ya está bien resuelto, se transforma con criterio. Conserva lo bueno, mejora lo débil, transforma lo necesario, agrega solo lo que aporte — no todo necesita cambiar de fondo, ni retoque, ni texto grande. Decides qué transformar, no qué repetir.";

async function getCustomSystemPrompt(): Promise<string | null> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: AI_IMAGE_PROMPT_KEY } });
    if (!setting?.encryptedValue) return null;
    try {
      const decrypted = decryptSecret(setting.encryptedValue);
      return decrypted.trim() || null;
    } catch {
      return setting.encryptedValue.trim() || null;
    }
  } catch {
    return null;
  }
}

async function fetchImageAsPng(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const raw = Buffer.from(await res.arrayBuffer());
    return await sharp(raw).png().toBuffer();
  } catch {
    return null;
  }
}

/**
 * Muchos logos se suben con fondo blanco/casi blanco sólido en vez de
 * transparente de verdad. Vuelve transparente cualquier píxel casi blanco
 * (umbral alto: el logo en sí casi nunca usa blanco puro extensivamente).
 */
async function removeNearWhiteBackground(png: Buffer, threshold = 245): Promise<Buffer> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    if (data[i] >= threshold && data[i + 1] >= threshold && data[i + 2] >= threshold) {
      data[i + 3] = 0;
    }
  }
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

/**
 * Pega el logo REAL sobre la imagen ya generada, con código determinístico
 * — nunca se le pide a la IA que lo dibuje. Probado en vivo el 20/8/2026:
 * pedirle al modelo que incorpore el logo como imagen de referencia lo
 * cortaba/deformaba de forma repetida pese a instrucciones explícitas. Esto
 * garantiza matemáticamente que nunca se corte, deforme ni rediseñe.
 */
async function compositeLogo(base: Buffer, width: number, height: number, logoPng: Buffer): Promise<Buffer> {
  const logoTransparent = await removeNearWhiteBackground(logoPng);
  const padding = Math.round(width * 0.06);
  const logoMaxWidth = Math.round(width * 0.34);
  const logoResized = await sharp(logoTransparent)
    .resize({ width: logoMaxWidth, height: Math.round(height * 0.1), fit: "inside" })
    .toBuffer();
  const meta = await sharp(logoResized).metadata();
  return sharp(base)
    .composite([
      {
        input: logoResized,
        left: Math.max(padding, width - (meta.width ?? logoMaxWidth) - padding),
        top: Math.max(padding, height - (meta.height ?? 60) - padding),
      },
    ])
    .toBuffer();
}

/**
 * ANALIZAR → DECIDIR → CONSTRUIR EL PROMPT VISUAL, en una sola llamada de
 * visión barata (gpt-4o-mini), con el prompt de Milton (editable en el
 * panel admin) como system message. El propio modelo arma "visualPrompt"
 * — la instrucción lista para usar en la edición de imagen, siguiendo la
 * metodología completa que Milton describe (no una traducción fija de
 * etiquetas de este código). Así su prompt controla de verdad el resultado
 * final, no solo una decisión intermedia.
 */
async function decideCreativeDirection(
  articleTitle: string,
  articleSummary: string,
  ogImagePng: Buffer,
  hasLogo: boolean,
  formatLabel: string,
): Promise<CreativeDecision | null> {
  if (!OPENAI_IMAGE_API_KEY) return null;
  try {
    const ogBase64 = ogImagePng.toString("base64");
    const customPrompt = await getCustomSystemPrompt();
    const res = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_IMAGE_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              (customPrompt || DEFAULT_SYSTEM_PROMPT) +
              "\n\nRespondes ÚNICAMENTE JSON válido con estas claves exactas — nada de markdown, nada de texto fuera del JSON:\n" +
              '"message": el texto/mensaje corto que decidiste para la publicación (lo que en tu metodología llamas "Texto").\n' +
              '"tagString": la secuencia corta de etiquetas que ensamblaste internamente (lo que en tu metodología es el "string"), como texto plano, ej. "/premiumeditorial /backgroundluxury /complexionrefine /advertisingtext /instagram /instagramstory /brandidentity /uselogo".\n' +
              '"visualPrompt": la instrucción visual FINAL, completa y lista para aplicar sobre la imagen OG adjunta — en inglés, la que de verdad va a usar el editor de imágenes para transformarla. Aplica ahí tu string y tu criterio completo: qué conservar de la foto, qué transformar, cómo tratar el fondo/retoque/tipografía, cómo integrar la marca. No la recortes ni la simplifiques por brevedad — esta es tu entrega real, el string y el texto son solo tu razonamiento interno.\n' +
              '"hasPeople": true/false, si la foto adjunta tiene personas.',
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `Red social y formato: Instagram, ${formatLabel}.\n` +
                  `Título del artículo: ${articleTitle}\n` +
                  `Resumen del artículo: ${articleSummary}\n` +
                  `¿Hay logo de marca disponible?: ${hasLogo ? "sí" : "no"}\n\n` +
                  `Aquí está la imagen OG del artículo. Analízala y aplica tu metodología completa.`,
              },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${ogBase64}` },
              },
            ],
          },
        ],
        max_tokens: 900,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CreativeDecision>;

    if (!parsed.message?.trim()) return null;
    if (!parsed.visualPrompt?.trim()) return null;
    if (typeof parsed.hasPeople !== "boolean") return null;

    return {
      message: parsed.message.trim(),
      hasPeople: parsed.hasPeople,
      visualPrompt: parsed.visualPrompt.trim(),
      tagString: parsed.tagString?.trim() || "",
    };
  } catch {
    return null;
  }
}

/**
 * Toma el visualPrompt que armó el propio modelo (siguiendo el prompt de
 * Milton) y le agrega SOLO las restricciones técnicas no negociables que no
 * son decisión creativa — margen de seguridad del texto, protección del
 * rostro, espacio reservado para el logo real. Estas van SIEMPRE, para
 * cualquier prompt que Milton escriba, porque son límites de la API/del
 * resultado final, no criterio editorial.
 */
function buildEditPrompt(decision: CreativeDecision, hasLogo: boolean, hasPhotoRef: boolean): string {
  return [
    decision.visualPrompt,
    `Headline text (Spanish): "${decision.message}"`,
    "TEXT SAFE ZONE, NON-NEGOTIABLE: the headline must fit entirely within the central 84% of the canvas width and 88% of the canvas height (an 8% empty margin on left/right, 6% on top/bottom, with nothing — no letter, stroke or serif — crossing into that margin). If the phrase is too long to fit at a comfortably readable size inside that safe zone, make the font smaller and/or break it into 2-3 shorter lines — never let it run past the safe zone, never shrink it to the point of being illegible either.",
    decision.hasPeople
      ? "ABSOLUTE RULE: the face is the highest-priority zone in the whole image — never cover eyes, nose, mouth or expression with text or anything else. Use empty/negative space instead."
      : "",
    hasLogo
      ? "Leave a clean, empty, uncluttered rectangular area in the bottom-right corner (roughly the bottom-right 30% width x 10% height of the frame) with nothing important there — no text, no busy detail, no headline text overlapping it. A real logo will be placed there afterward by separate exact compositing, so do not draw, sketch or invent any logo or brand text yourself in that corner."
      : "",
    hasPhotoRef
      ? "A person reference photo is also included — incorporate them naturally and tastefully where it fits."
      : "",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 4000);
}

/**
 * Genera la imagen de Instagram Story/Reel/Post con IA, transformando (no
 * copiando ni generando desconectado) la imagen OG del artículo. Devuelve
 * null si CUALQUIER paso falla — quien llama debe cancelar la oportunidad,
 * no publicar sin imagen ni reintentar.
 */
export async function generateAiInstagramImage(params: {
  articleTitle: string;
  articleSummary: string;
  ogImageUrl: string;
  format: AiImageFormat;
  businessLogoUrl?: string | null;
  profilePhotoUrl?: string | null;
  pathPrefix: string;
}): Promise<string | null> {
  if (!OPENAI_IMAGE_API_KEY) return null;

  const target = FORMAT_TARGET[params.format];
  const formatLabel = FORMAT_LABEL[params.format];

  const ogPng = await fetchImageAsPng(params.ogImageUrl);
  if (!ogPng) return null;

  // El logo es OBLIGATORIO usarlo cuando existe (regla explícita de Milton:
  // "si el logo existe, su uso es obligatorio, nunca debe omitirse"). La
  // foto de perfil del usuario sigue siendo aleatoria — pedido explícito de
  // que las imágenes no se vean todas iguales.
  const logoPng = params.businessLogoUrl ? await fetchImageAsPng(params.businessLogoUrl) : null;
  const usePhoto = Boolean(params.profilePhotoUrl) && Math.random() < 0.3;
  const photoPng = usePhoto && params.profilePhotoUrl ? await fetchImageAsPng(params.profilePhotoUrl) : null;

  const decision = await decideCreativeDirection(
    params.articleTitle,
    params.articleSummary,
    ogPng,
    Boolean(logoPng),
    formatLabel,
  );
  if (!decision) return null;

  // El logo NUNCA se le pasa a la IA como referencia a dibujar (probado en
  // vivo: lo cortaba/deformaba pese a instrucciones explícitas) — se pega
  // aparte, después, con código exacto. Solo la OG y la foto de perfil
  // (cuando aplica) van como referencias reales al modelo.
  const refImages = [ogPng, photoPng].filter((b): b is Buffer => b !== null);
  const prompt = buildEditPrompt(decision, Boolean(logoPng), Boolean(photoPng));

  try {
    const form = new FormData();
    form.append("model", "gpt-image-1-mini");
    form.append("prompt", prompt);
    form.append("size", target.editSize);
    // Calidad explícita (pedido de Milton por costo, 20/8/2026): "auto"
    // default puede cobrar como "high" ($0.25). Se probó "low" (~$0.005) y
    // Milton pidió volver a "medium" (~$0.015/imagen) — mejor punto medio
    // de nitidez de texto/logo para el costo.
    form.append("quality", "medium");
    form.append("n", "1");
    refImages.forEach((buf, i) => {
      form.append("image[]", new Blob([new Uint8Array(buf)], { type: "image/png" }), `ref${i}.png`);
    });

    const res = await fetch(OPENAI_EDIT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_IMAGE_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[AI Image] OpenAI images/edits falló: ${res.status} ${errText.slice(0, 300)}`);
      return null;
    }
    const data = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) return null;

    const rawOutput = Buffer.from(b64, "base64");
    const resized = await sharp(rawOutput)
      .resize(target.width, target.height, { fit: "cover", position: "attention" })
      .toBuffer();
    const withLogo = logoPng ? await compositeLogo(resized, target.width, target.height, logoPng) : resized;

    // JPEG en vez de PNG: gpt-image-1-mini devuelve PNG pesado, e Instagram
    // tarda en procesar el media proporcionalmente a su peso. JPEG calidad
    // 90 pesa una fracción de eso sin pérdida visible.
    const finalBuffer = await sharp(withLogo).jpeg({ quality: 90 }).toBuffer();

    const blob = await put(`${params.pathPrefix}/${Date.now()}.jpg`, finalBuffer, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: false,
    });

    const checkRes = await fetch(blob.url, { method: "HEAD" });
    if (!checkRes.ok) return null;

    console.log(
      `[AI Image] Generada: ${blob.url} (${(finalBuffer.length / 1024).toFixed(0)}KB) — ` +
        `string: ${decision.tagString || "(sin tagString)"}` +
        `${logoPng ? " +logo" : ""}${photoPng ? " +foto" : ""}`,
    );
    return blob.url;
  } catch (err) {
    console.warn("[AI Image] Fallo generando imagen con IA:", err);
    return null;
  }
}
