// Generador de imágenes con IA para redes sociales ("Creador de Imágenes
// para Redes Sociales", 20/8/2026). Es un generador APARTE de los que ya
// existían (socialPublish.ts, businessProfilePublish.ts) — no los toca ni
// los reemplaza, por decisión explícita de Milton.
//
// Parte SIEMPRE de la imagen OG real del artículo (edición, no generación
// desde cero — regla explícita, repetida varias veces por Milton: "no debes
// generar una composición desconectada de la fotografía original") y usa el
// logo/foto del usuario de forma variable, no siempre. Una sola generación
// por oportunidad: si algo falla en cualquier paso, devuelve null y quien
// llama debe cancelar la oportunidad — no hay reintento ni regeneración
// gratuita (decisión explícita, por costo).
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
const OPENAI_EDIT_URL = "https://api.openai.com/v1/images/edits";

export type AiImageFormat = "story" | "reel-image";

// Tamaño que se le pide a gpt-image-1 (solo soporta 1024x1024, 1024x1536,
// 1536x1024) y tamaño final real de Instagram Story/Reel al que se recorta
// después con sharp. Cuando este módulo cubra más redes, este mapa crece.
const FORMAT_TARGET: Record<AiImageFormat, { editSize: "1024x1536"; width: number; height: number }> = {
  story: { editSize: "1024x1536", width: 1080, height: 1920 },
  "reel-image": { editSize: "1024x1536", width: 1080, height: 1920 },
};

// ─── ETIQUETAS DEL PROMPT ORIGINAL DE MILTON ──────────────────────────────
// Cada categoría, con su traducción a una instrucción descriptiva en inglés
// (el idioma con el que gpt-image-1 responde mejor). El modelo de decisión
// elige la CLAVE (ej. "backgroundcinematic"); acá se traduce a la frase que
// entra al prompt visual final.

const BACKGROUND_TAGS = {
  backgroundenhance: "Subtly enhance the existing background — richer color, better light — without changing what it is.",
  backgroundrefine: "Refine and clean up the existing background: remove clutter and distractions, keep its identity.",
  backgroundreplace: "Replace the background with a new one that better fits the story, since the original doesn't help.",
  backgroundblur: "Add a soft depth-of-field blur to the background so the subject stands out.",
  backgrounddepth: "Add cinematic depth and layering to the background.",
  backgroundcinematic: "Give the background a cinematic, moody, professionally lit look.",
  backgroundluxury: "Give the background a luxury, upscale, premium feel.",
  backgroundstudio: "Replace the background with a clean professional studio backdrop.",
  backgroundclean: "Simplify the background to something clean and minimal so nothing competes with the subject.",
  backgroundmatch: "Keep the background as-is — it already fits the story, just polish it slightly.",
} as const;

const RETOUCH_TAGS = {
  beautyretouch: "Gentle, professional beauty retouch — polished but real.",
  naturalretouch: "Very light, natural retouch — barely noticeable.",
  skinrefine: "Refine skin texture subtly, keep visible pores and natural texture.",
  skinsmooth: "Smooth minor skin imperfections without losing texture.",
  complexionrefine: "Even out skin tone slightly.",
  faceenhance: "Subtle, tasteful enhancement of facial clarity and lighting.",
  bodyretouch: "Very subtle, respectful body retouch — no reshaping.",
  bodyrefine: "Minor natural refinement, nothing exaggerated.",
  stretchmarksoften: "Very subtle softening, nothing artificial.",
  beautypolish: "Overall light polish — professional campaign look.",
  none: "Do not retouch skin or body at all — leave people exactly as photographed.",
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

const BRAND_TAGS = {
  brandidentity: "make it feel authentically part of this brand's identity",
  brandcolors: "echo the brand's colors from the logo elsewhere in the composition",
  brandstyle: "match the brand's visual style and personality from the logo",
  brandguidelines: "respect the brand's implied guidelines (formality, tone) from the logo",
  brandconsistency: "keep it consistent with how this brand would present itself",
  logoplacement: "place the logo in the most natural, unobtrusive corner for this format",
  brandlayout: "let the layout itself reflect the brand's personality",
  visualidentity: "reinforce the brand's overall visual identity",
  brandpresence: "give the brand a confident but tasteful presence in the image",
} as const;

type BackgroundTag = keyof typeof BACKGROUND_TAGS;
type RetouchTag = keyof typeof RETOUCH_TAGS;
type DirectionTag = keyof typeof DIRECTION_TAGS;
type TextTag = keyof typeof TEXT_TAGS;
type BrandTag = keyof typeof BRAND_TAGS;

interface CreativeDecision {
  message: string;
  backgroundTag: BackgroundTag;
  retouchTag: RetouchTag;
  directionTag: DirectionTag;
  textTag: TextTag;
  brandTags: BrandTag[];
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
 * del prompt original) junto con el artículo, y decide una etiqueta de cada
 * categoría (fondo, retoque, dirección creativa, tipografía, marca) más el
 * mensaje corto — exactamente el mismo criterio del prompt original, solo
 * que en JSON en vez de una lista de etiquetas en texto.
 */
async function decideCreativeDirection(
  articleTitle: string,
  articleSummary: string,
  ogImagePng: Buffer,
  hasLogo: boolean,
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
              "Eres un director creativo profesional de publicaciones para redes sociales. Analizas a fondo una foto real (personas, rasgos, pose, encuadre, iluminación, colores, fondo, espacio disponible para texto, calidad, elementos que deben mantenerse y elementos que pueden mejorarse) junto con el artículo que la acompaña, y decides con criterio profesional cómo convertirla en una pieza de campaña — sin generar una composición desconectada de la foto original, siempre partiendo de ella. Respondes ÚNICAMENTE JSON válido.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `Título del artículo: ${articleTitle}\nResumen: ${articleSummary}\n` +
                  `¿Hay logo de marca disponible para usar?: ${hasLogo ? "sí" : "no"}\n\n` +
                  `Analiza la foto adjunta a fondo y decide JSON con exactamente estas claves:\n\n` +
                  `"message": frase corta y poderosa en español, 3 a 9 palabras, humana y emocional, conectada con la necesidad o beneficio real del lector. No copies el título literal.\n\n` +
                  `"backgroundTag": elige UNA de estas claves según si el fondo de la foto ayuda a contar la historia (consérvalo/mejóralo) o no (reemplázalo): ${Object.keys(BACKGROUND_TAGS).join(", ")}.\n\n` +
                  `"retouchTag": elige UNA. Si NO hay personas en la foto, usa "none". Si hay personas, elige el retoque que mejora la presentación SIN cambiar identidad/edad/proporciones, nunca "plástico": ${Object.keys(RETOUCH_TAGS).join(", ")}.\n\n` +
                  `"directionTag": elige UNA dirección creativa según el contenido del artículo y la foto: ${Object.keys(DIRECTION_TAGS).join(", ")}.\n\n` +
                  `"textTag": elige UNA según red social (Instagram), tema, audiencia, emoción, la foto en sí, jerarquía y espacio disponible para el texto que viste en la foto: ${Object.keys(TEXT_TAGS).join(", ")}.\n\n` +
                  `"brandTags": arreglo de 0 a 3 claves, SOLO si hay logo disponible (si no hay logo, arreglo vacío []), de las que aporten valor real: ${Object.keys(BRAND_TAGS).join(", ")}.`,
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
    if (!parsed.backgroundTag || !(parsed.backgroundTag in BACKGROUND_TAGS)) return null;
    if (!parsed.retouchTag || !(parsed.retouchTag in RETOUCH_TAGS)) return null;
    if (!parsed.directionTag || !(parsed.directionTag in DIRECTION_TAGS)) return null;
    if (!parsed.textTag || !(parsed.textTag in TEXT_TAGS)) return null;
    const brandTags = Array.isArray(parsed.brandTags)
      ? parsed.brandTags.filter((t): t is BrandTag => typeof t === "string" && t in BRAND_TAGS)
      : [];

    return {
      message: parsed.message.trim(),
      backgroundTag: parsed.backgroundTag,
      retouchTag: parsed.retouchTag,
      directionTag: parsed.directionTag,
      textTag: parsed.textTag,
      brandTags,
    };
  } catch {
    return null;
  }
}

function buildEditPrompt(decision: CreativeDecision, includesExtraRefs: boolean): string {
  const brandPhrases = decision.brandTags.map((t) => BRAND_TAGS[t]);
  return [
    "Edit this photo into a finished, professional social media campaign image ready to publish on Instagram — start from this exact photo, never a disconnected new composition.",
    BACKGROUND_TAGS[decision.backgroundTag],
    RETOUCH_TAGS[decision.retouchTag],
    `Overall creative direction: ${DIRECTION_TAGS[decision.directionTag]}.`,
    `Typography style for the headline: ${TEXT_TAGS[decision.textTag]}.`,
    includesExtraRefs
      ? "Additional reference images are provided (brand logo and/or a person's photo) — incorporate them naturally and tastefully only where it visually fits, without forcing them into the composition."
      : "",
    brandPhrases.length > 0 ? brandPhrases.join(" ") : "",
    `Overlay this short headline text, in Spanish, large and perfectly legible, well composed within the frame: "${decision.message}"`,
    "CRITICAL: never place the headline text over anyone's face, eyes or head — pick empty negative space instead (sky, blank wall, out-of-focus background, upper or lower third of the frame) so every face in the photo stays fully visible and unobstructed.",
    "Keep any real people from the base photo clearly recognizable — do not change their identity, age or proportions.",
    "If a logo reference image is included, preserve its exact colors and shape — do not redesign it, place it small and naturally, respecting brand identity.",
    "Vertical full-bleed composition, no black bars, no added watermarks besides the provided logo.",
    "Before finishing, this must feel like it would stop someone mid-scroll, connect with a real human need, represent the article correctly, and look finished and ready to publish — not a draft.",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 4000);
}

/**
 * Genera la imagen de Instagram Story/Reel-image con IA, partiendo de la
 * imagen OG del artículo. Devuelve null si CUALQUIER paso falla — quien
 * llama debe cancelar la oportunidad, no publicar sin imagen ni reintentar.
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

  // Decisión aleatoria e independiente entre sí: no siempre se usan, para
  // que las imágenes no se vean todas iguales (pedido explícito de Milton).
  const useLogo = Boolean(params.businessLogoUrl) && Math.random() < 0.6;
  const usePhoto = Boolean(params.profilePhotoUrl) && Math.random() < 0.3;

  const decision = await decideCreativeDirection(
    params.articleTitle,
    params.articleSummary,
    ogPng,
    useLogo,
  );
  if (!decision) return null;

  const refImages: Buffer[] = [ogPng];
  if (useLogo && params.businessLogoUrl) {
    const logoPng = await fetchImageAsPng(params.businessLogoUrl);
    if (logoPng) refImages.push(logoPng);
  }
  if (usePhoto && params.profilePhotoUrl) {
    const photoPng = await fetchImageAsPng(params.profilePhotoUrl);
    if (photoPng) refImages.push(photoPng);
  }

  const prompt = buildEditPrompt(decision, refImages.length > 1);

  try {
    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("prompt", prompt);
    form.append("size", target.editSize);
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
    // JPEG en vez de PNG: gpt-image-1 devuelve PNG pesado (varios MB para una
    // foto), e Instagram tarda en procesar el media proporcionalmente a su
    // peso. JPEG calidad 90 pesa una fracción de eso sin pérdida visible.
    const finalBuffer = await sharp(rawOutput)
      .resize(target.width, target.height, { fit: "cover", position: "attention" })
      .jpeg({ quality: 90 })
      .toBuffer();

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
        (decision.brandTags.length ? `/${decision.brandTags.join(",")}` : ""),
    );
    return blob.url;
  } catch (err) {
    console.warn("[AI Image] Fallo generando imagen con IA:", err);
    return null;
  }
}
