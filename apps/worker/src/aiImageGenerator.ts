// Generador de imágenes con IA para redes sociales ("Creador de Imágenes
// para Redes Sociales", 20/8/2026). Es un generador APARTE de los que ya
// existían (socialPublish.ts, businessProfilePublish.ts) — no los toca ni
// los reemplaza, por decisión explícita de Milton.
//
// Regla explícita de Milton (20/8/2026): la imagen OG se ANALIZA, nunca se
// copia ni se edita píxel a píxel. La IA genera una imagen NUEVA, informada
// por ese análisis (personas, pose, colores, fondo, mood) — no una edición
// de la foto original. El logo y la foto de perfil del usuario, cuando se
// usan, se componen encima con código determinístico (sharp), no se le
// piden a la IA — así conservan su identidad exacta sin que el modelo los
// "redibuje" aproximados.
//
// Una sola generación por oportunidad: si algo falla en cualquier paso,
// devuelve null y quien llama debe cancelar la oportunidad — no hay
// reintento ni regeneración gratuita (decisión explícita, por costo).
//
// El motor de decisión (ANALIZAR → DECIDIR → CONSTRUIR EL PROMPT VISUAL →
// CREAR LA IMAGEN) traduce el prompt original de Milton (ver
// MASTER_BLUEPRINT_CREADOR_DE_IMAGENES.md, anexo) a etiquetas por categoría
// —fondo, retoque, dirección creativa, tipografía, marca— igual que en ese
// prompt, con una sola diferencia: aquí las decide un modelo de visión en
// una sola llamada barata, no una conversación con el usuario.
//
// Usa una API key de OpenAI SEPARADA (OPENAI_IMAGE_API_KEY) de la que ya
// usa el resto de la plataforma, para poder medir/facturar este módulo
// aparte.

import sharp from "sharp";
import { put } from "@vercel/blob";

const OPENAI_IMAGE_API_KEY = process.env.OPENAI_IMAGE_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_GENERATE_URL = "https://api.openai.com/v1/images/generations";

export type AiImageFormat = "story" | "reel-image";

// Tamaño que se le pide a gpt-image-1 (solo soporta 1024x1024, 1024x1536,
// 1536x1024) y tamaño final real de Instagram Story/Reel al que se recorta
// después con sharp. Cuando este módulo cubra más redes, este mapa crece.
const FORMAT_TARGET: Record<AiImageFormat, { genSize: "1024x1536"; width: number; height: number }> = {
  story: { genSize: "1024x1536", width: 1080, height: 1920 },
  "reel-image": { genSize: "1024x1536", width: 1080, height: 1920 },
};

// ─── ETIQUETAS DEL PROMPT ORIGINAL DE MILTON ──────────────────────────────
// Cada categoría, con su traducción a una instrucción descriptiva en inglés
// (el idioma con el que gpt-image-1 responde mejor). El modelo de decisión
// elige la CLAVE (ej. "backgroundcinematic"); acá se traduce a la frase que
// entra al prompt visual final.

const BACKGROUND_TAGS = {
  backgroundenhance: "a rich, well-lit version of a background like the one in the reference scene",
  backgroundrefine: "a clean, uncluttered version of a background like the one in the reference scene",
  backgroundreplace: "a completely new background that fits the story better than the reference scene",
  backgroundblur: "a background with soft depth-of-field blur so the subject stands out",
  backgrounddepth: "a background with cinematic depth and layering",
  backgroundcinematic: "a cinematic, moody, professionally lit background",
  backgroundluxury: "a luxury, upscale, premium-feeling background",
  backgroundstudio: "a clean professional studio backdrop",
  backgroundclean: "a simple, minimal background so nothing competes with the subject",
  backgroundmatch: "a background that matches the mood of the reference scene, lightly polished",
} as const;

const RETOUCH_TAGS = {
  beautyretouch: "polished but real, professional beauty look",
  naturalretouch: "very natural, barely retouched look",
  skinrefine: "refined skin texture, keeping natural texture and pores",
  skinsmooth: "smooth, healthy-looking skin without losing texture",
  complexionrefine: "even, natural skin tone",
  faceenhance: "subtle, tasteful facial clarity and lighting",
  bodyretouch: "respectful, natural body presentation, no reshaping",
  bodyrefine: "minor natural refinement, nothing exaggerated",
  stretchmarksoften: "soft, natural skin, nothing artificial",
  beautypolish: "an overall light, professional campaign polish",
  none: "completely natural, unretouched people",
} as const;

const DIRECTION_TAGS = {
  premiumshowcase: "premium showcase style",
  cinematicportrait: "cinematic portrait style, dramatic lighting",
  editorialportrait: "editorial magazine portrait style",
  luxuryportrait: "luxury portrait style",
  fashioneditorial: "fashion editorial style",
  studioportrait: "clean studio portrait style",
  lifestyleportrait: "natural lifestyle portrait style",
  magazineportrait: "magazine cover portrait style",
  softcinematic: "soft cinematic style, warm tones",
  premiumeditorial: "premium editorial campaign style",
} as const;

const TEXT_TAGS = {
  headlineposter: "bold poster-style headline typography",
  luxurytypography: "elegant luxury typography, refined serif or thin sans-serif",
  editorialtext: "editorial magazine-style typography",
  boldheadline: "big bold sans-serif headline typography",
  premiumheadline: "premium, confident headline typography",
  cinematictext: "cinematic movie-poster-style typography",
  magazinecover: "magazine cover masthead-style typography",
  advertisingtext: "punchy advertising-style typography",
  minimaltypography: "minimal, clean, understated typography",
  socialheadline: "casual, friendly social-media-native typography",
} as const;

type BackgroundTag = keyof typeof BACKGROUND_TAGS;
type RetouchTag = keyof typeof RETOUCH_TAGS;
type DirectionTag = keyof typeof DIRECTION_TAGS;
type TextTag = keyof typeof TEXT_TAGS;

interface CreativeDecision {
  message: string;
  sceneDescription: string;
  hasPeople: boolean;
  backgroundTag: BackgroundTag;
  retouchTag: RetouchTag;
  directionTag: DirectionTag;
  textTag: TextTag;
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
 * ANALIZAR → DECIDIR, en una sola llamada de visión (barata: gpt-4o-mini).
 * Analiza a fondo la imagen OG (personas, pose, encuadre, fondo, espacio
 * para texto, calidad — igual que el "ANÁLISIS PROFUNDO DE LA IMAGEN OG"
 * del prompt original) junto con el artículo, y decide el mensaje, una
 * descripción de escena en texto (para inspirar la generación, NUNCA para
 * copiar la foto), y una etiqueta de cada categoría — mismo criterio del
 * prompt original, en JSON.
 */
async function decideCreativeDirection(
  articleTitle: string,
  articleSummary: string,
  ogImagePng: Buffer,
): Promise<CreativeDecision | null> {
  if (!OPENAI_IMAGE_API_KEY) return null;
  try {
    const ogBase64 = ogImagePng.toString("base64");
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
              "Eres un director creativo profesional de publicaciones para redes sociales. Analizas a fondo una foto real (personas, rasgos, pose, encuadre, iluminación, colores, fondo, elementos que deben mantenerse y elementos que pueden mejorarse) junto con el artículo que la acompaña. Tu trabajo es ANALIZARLA para inspirar una imagen NUEVA — nunca copiarla ni describirla para reproducirla literalmente. Respondes ÚNICAMENTE JSON válido.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `Título del artículo: ${articleTitle}\nResumen: ${articleSummary}\n\n` +
                  `Analiza la foto adjunta a fondo y decide JSON con exactamente estas claves:\n\n` +
                  `"message": frase corta y poderosa en español, 3 a 9 palabras, humana y emocional, conectada con la necesidad o beneficio real del lector. No copies el título literal.\n\n` +
                  `"hasPeople": true si la foto tiene personas, false si no.\n\n` +
                  `"sceneDescription": en inglés, 2-3 frases describiendo la ESCENA que inspirará la imagen nueva (tipo de persona/ambiente/objetos si aplica, mood, paleta de color) — es inspiración para generar algo nuevo, NO una descripción para reproducir la foto literalmente.\n\n` +
                  `"backgroundTag": elige UNA de estas claves según si el fondo de la foto ayuda a contar la historia (consérvalo/mejóralo) o no (reemplázalo): ${Object.keys(BACKGROUND_TAGS).join(", ")}.\n\n` +
                  `"retouchTag": elige UNA. Si hasPeople es false, usa "none". Si hay personas, elige el retoque que mejora la presentación sin cambiar identidad, nunca "plástico": ${Object.keys(RETOUCH_TAGS).join(", ")}.\n\n` +
                  `"directionTag": elige UNA dirección creativa según el contenido del artículo y la foto: ${Object.keys(DIRECTION_TAGS).join(", ")}.\n\n` +
                  `"textTag": elige UNA según red social (Instagram), tema, audiencia, emoción, jerarquía y espacio disponible: ${Object.keys(TEXT_TAGS).join(", ")}.`,
              },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${ogBase64}` },
              },
            ],
          },
        ],
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CreativeDecision>;

    if (!parsed.message?.trim()) return null;
    if (!parsed.sceneDescription?.trim()) return null;
    if (typeof parsed.hasPeople !== "boolean") return null;
    if (!parsed.backgroundTag || !(parsed.backgroundTag in BACKGROUND_TAGS)) return null;
    if (!parsed.retouchTag || !(parsed.retouchTag in RETOUCH_TAGS)) return null;
    if (!parsed.directionTag || !(parsed.directionTag in DIRECTION_TAGS)) return null;
    if (!parsed.textTag || !(parsed.textTag in TEXT_TAGS)) return null;

    return {
      message: parsed.message.trim(),
      sceneDescription: parsed.sceneDescription.trim(),
      hasPeople: parsed.hasPeople,
      backgroundTag: parsed.backgroundTag,
      retouchTag: parsed.retouchTag,
      directionTag: parsed.directionTag,
      textTag: parsed.textTag,
    };
  } catch {
    return null;
  }
}

function buildGeneratePrompt(decision: CreativeDecision): string {
  return [
    "Create a brand-new, finished, professional social media campaign photo ready to publish on Instagram — photorealistic, not an illustration.",
    `Scene inspiration (reinterpret freely, do not copy any specific existing photo): ${decision.sceneDescription}`,
    `Background: ${BACKGROUND_TAGS[decision.backgroundTag]}.`,
    decision.hasPeople ? `People in the scene should look: ${RETOUCH_TAGS[decision.retouchTag]}.` : "",
    `Overall creative direction: ${DIRECTION_TAGS[decision.directionTag]}.`,
    `Typography style for the headline: ${TEXT_TAGS[decision.textTag]}.`,
    `Overlay this short headline text, in Spanish, large and perfectly legible, well composed within the frame: "${decision.message}"`,
    decision.hasPeople
      ? "CRITICAL: never place the headline text over anyone's face, eyes or head — pick empty negative space instead (sky, blank wall, out-of-focus background, upper or lower third of the frame) so every face stays fully visible."
      : "Place the headline text in a well-composed area with clean negative space.",
    "Leave clean, uncluttered empty space in a bottom corner (roughly the size of a small logo) for a brand logo to be added afterward — do not draw any logo or brand text yourself.",
    "Vertical full-bleed composition, no black bars, no watermarks, no added text besides the headline.",
    "Before finishing, this must feel like it would stop someone mid-scroll, connect with a real human need, and look finished and ready to publish — not a draft.",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 4000);
}

/** Recorta `img` en círculo y le agrega un borde blanco — para la foto de perfil. */
async function circularAvatar(img: Buffer, diameter: number): Promise<Buffer> {
  const resized = await sharp(img).resize(diameter, diameter, { fit: "cover" }).toBuffer();
  const mask = Buffer.from(
    `<svg width="${diameter}" height="${diameter}"><circle cx="${diameter / 2}" cy="${diameter / 2}" r="${diameter / 2}" fill="#fff"/></svg>`,
  );
  const circled = await sharp(resized)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
  const borderSize = diameter + 10;
  const border = Buffer.from(
    `<svg width="${borderSize}" height="${borderSize}"><circle cx="${borderSize / 2}" cy="${borderSize / 2}" r="${borderSize / 2}" fill="#fff"/></svg>`,
  );
  return sharp(border)
    .composite([{ input: circled, top: 5, left: 5 }])
    .png()
    .toBuffer();
}

/**
 * Compone el logo y/o la foto de perfil REALES sobre la imagen generada, con
 * código determinístico — nunca se le piden a la IA, para que conserven su
 * identidad exacta (pedido explícito: el logo no debe rediseñarse).
 */
async function compositeRealAssets(
  base: Buffer,
  width: number,
  height: number,
  logoPng: Buffer | null,
  photoPng: Buffer | null,
): Promise<Buffer> {
  const composites: { input: Buffer; left: number; top: number }[] = [];
  const padding = Math.round(width * 0.05);

  if (logoPng) {
    const logoMaxWidth = Math.round(width * 0.32);
    const logoResized = await sharp(logoPng)
      .resize({ width: logoMaxWidth, height: Math.round(height * 0.12), fit: "inside" })
      .toBuffer();
    const meta = await sharp(logoResized).metadata();
    composites.push({
      input: logoResized,
      left: Math.max(padding, width - (meta.width ?? logoMaxWidth) - padding),
      top: Math.max(padding, height - (meta.height ?? 60) - padding),
    });
  }

  if (photoPng) {
    const diameter = Math.round(width * 0.22);
    const avatar = await circularAvatar(photoPng, diameter);
    composites.push({ input: avatar, left: padding, top: height - diameter - padding - 10 });
  }

  if (composites.length === 0) return base;
  return sharp(base).composite(composites).toBuffer();
}

/**
 * Genera la imagen de Instagram Story/Reel-image con IA, ANALIZANDO (no
 * copiando) la imagen OG del artículo. Devuelve null si CUALQUIER paso
 * falla — quien llama debe cancelar la oportunidad, no publicar sin imagen
 * ni reintentar.
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

  const ogPng = await fetchImageAsPng(params.ogImageUrl);
  if (!ogPng) return null;

  const decision = await decideCreativeDirection(params.articleTitle, params.articleSummary, ogPng);
  if (!decision) return null;

  // Decisión aleatoria e independiente entre sí: no siempre se usan, para
  // que las imágenes no se vean todas iguales (pedido explícito de Milton).
  const useLogo = Boolean(params.businessLogoUrl) && Math.random() < 0.6;
  const usePhoto = Boolean(params.profilePhotoUrl) && Math.random() < 0.3;

  const [logoPng, photoPng] = await Promise.all([
    useLogo && params.businessLogoUrl ? fetchImageAsPng(params.businessLogoUrl) : Promise.resolve(null),
    usePhoto && params.profilePhotoUrl ? fetchImageAsPng(params.profilePhotoUrl) : Promise.resolve(null),
  ]);

  const prompt = buildGeneratePrompt(decision);

  try {
    const res = await fetch(OPENAI_GENERATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_IMAGE_API_KEY}` },
      body: JSON.stringify({ model: "gpt-image-1", prompt, size: target.genSize, n: 1 }),
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[AI Image] OpenAI images/generations falló: ${res.status} ${errText.slice(0, 300)}`);
      return null;
    }
    const data = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) return null;

    const rawOutput = Buffer.from(b64, "base64");
    const resized = await sharp(rawOutput)
      .resize(target.width, target.height, { fit: "cover", position: "attention" })
      .toBuffer();

    const withAssets = await compositeRealAssets(resized, target.width, target.height, logoPng, photoPng);

    // JPEG en vez de PNG: gpt-image-1 devuelve PNG pesado (varios MB para una
    // foto), e Instagram tarda en procesar el media proporcionalmente a su
    // peso. JPEG calidad 90 pesa una fracción de eso sin pérdida visible.
    const finalBuffer = await sharp(withAssets).jpeg({ quality: 90 }).toBuffer();

    const blob = await put(`${params.pathPrefix}/${Date.now()}.jpg`, finalBuffer, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: false,
    });

    const checkRes = await fetch(blob.url, { method: "HEAD" });
    if (!checkRes.ok) return null;

    console.log(
      `[AI Image] Generada: ${blob.url} (${(finalBuffer.length / 1024).toFixed(0)}KB) — ` +
        `tags: ${decision.backgroundTag}/${decision.retouchTag}/${decision.directionTag}/${decision.textTag}` +
        `${logoPng ? " +logo" : ""}${photoPng ? " +foto" : ""}`,
    );
    return blob.url;
  } catch (err) {
    console.warn("[AI Image] Fallo generando imagen con IA:", err);
    return null;
  }
}
