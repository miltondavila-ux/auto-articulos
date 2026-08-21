// Generador de imágenes con IA para redes sociales ("Creador de Imágenes
// para Redes Sociales", 20/8/2026). Es un generador APARTE de los que ya
// existían (socialPublish.ts, businessProfilePublish.ts) — no los toca ni
// los reemplaza, por decisión explícita de Milton.
//
// Traduce el prompt v3 de Milton (20/8/2026, "Director Creativo Senior"): la
// imagen OG se le pasa DIRECTO a la IA como materia prima principal (no hace
// falta describirla en texto — "no debe describir nuevamente mediante texto
// aquello que ya puede comprender visualmente"). El string de instrucción
// debe ser CORTO — solo indica QUÉ transformar, no vuelve a describir lo que
// la imagen ya muestra. "Conserva lo bueno, mejora lo débil, transforma lo
// necesario, agrega solo lo que aporte" — no genera una composición
// desconectada de la fotografía original, y no todo necesita cambiar (no
// todo fondo, no todo retoque, no todo texto grande). El logo, cuando
// existe, es OBLIGATORIO usarlo (nunca se omite por comodidad), completo y
// sin rediseñar. El texto nunca se corta ni tapa el rostro — regla absoluta.
//
// Una sola generación por oportunidad: si algo falla en cualquier paso,
// devuelve null y quien llama debe cancelar la oportunidad — no hay
// reintento ni regeneración gratuita (decisión explícita, por costo).
//
// Usa una API key de OpenAI SEPARADA (OPENAI_IMAGE_API_KEY) de la que ya
// usa el resto de la plataforma, para poder medir/facturar este módulo
// aparte. Modelo gpt-image-1-mini + calidad "medium" explícita (pedido de
// Milton por costo, 20/8/2026): ~$0.015/imagen en vez de hasta $0.25.

import sharp from "sharp";
import { put } from "@vercel/blob";

const OPENAI_IMAGE_API_KEY = process.env.OPENAI_IMAGE_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_EDIT_URL = "https://api.openai.com/v1/images/edits";

export type AiImageFormat = "story" | "reel-image";

// Tamaño que se le pide a gpt-image-1-mini (solo soporta 1024x1024,
// 1024x1536, 1536x1024) y tamaño final real de Instagram Story/Reel al que
// se recorta después con sharp. Cuando este módulo cubra más redes, este
// mapa crece.
const FORMAT_TARGET: Record<AiImageFormat, { editSize: "1024x1536"; width: number; height: number }> = {
  story: { editSize: "1024x1536", width: 1080, height: 1920 },
  "reel-image": { editSize: "1024x1536", width: 1080, height: 1920 },
};

// ─── ETIQUETAS DEL PROMPT DE MILTON ───────────────────────────────────────
// Frases CORTAS en inglés — el string debe ser una receta compacta, no una
// descripción larga ("economía de tokens": ahorra redundancia, no
// inteligencia). El modelo de decisión elige la CLAVE; acá se traduce a la
// frase corta que entra al string final.

const BACKGROUND_TAGS = {
  backgroundenhance: "enhance the background",
  backgroundrefine: "refine and clean the background",
  backgroundreplace: "replace the background, it doesn't serve the story",
  backgroundblur: "blur the background for depth separation",
  backgrounddepth: "add cinematic depth to the background",
  backgroundcinematic: "cinematic background treatment",
  backgroundluxury: "luxury background treatment",
  backgroundstudio: "studio background treatment",
  backgroundclean: "clean, minimal background",
  backgroundmatch: "keep the background, just polish it",
} as const;

const RETOUCH_TAGS = {
  beautyretouch: "beauty retouch",
  naturalretouch: "natural retouch",
  skinrefine: "skin refine",
  skinsmooth: "skin smooth",
  complexionrefine: "complexion refine",
  faceenhance: "face enhance",
  bodyretouch: "body retouch",
  bodyrefine: "body refine",
  stretchmarksoften: "soften stretch marks",
  beautypolish: "beauty polish",
  none: "no retouch, leave people exactly as photographed",
} as const;

const DIRECTION_TAGS = {
  premiumshowcase: "premium showcase style",
  cinematicportrait: "cinematic portrait style",
  editorialportrait: "editorial portrait style",
  luxuryportrait: "luxury portrait style",
  fashioneditorial: "fashion editorial style",
  studioportrait: "studio portrait style",
  lifestyleportrait: "lifestyle portrait style",
  magazineportrait: "magazine portrait style",
  softcinematic: "soft cinematic style",
  premiumeditorial: "premium editorial style",
} as const;

const TEXT_TAGS = {
  headlineposter: "headline poster typography",
  luxurytypography: "luxury typography",
  editorialtext: "editorial typography",
  boldheadline: "bold headline typography",
  premiumheadline: "premium headline typography",
  cinematictext: "cinematic typography",
  magazinecover: "magazine cover typography",
  advertisingtext: "advertising typography",
  minimaltypography: "minimal typography",
  socialheadline: "social headline typography",
} as const;

const BRAND_TAGS = {
  brandidentity: "brand identity",
  brandcolors: "brand colors",
  brandstyle: "brand style",
  brandguidelines: "brand guidelines",
  brandconsistency: "brand consistency",
  logoplacement: "natural logo placement",
  brandlayout: "brand-driven layout",
  visualidentity: "visual identity",
  brandpresence: "brand presence",
} as const;

// Cómo se compone la pieza alrededor de lo que ya hay en la foto (prompt
// v3, sección 12 "COMPOSICIÓN").
const COMPOSITION_TAGS = {
  subjectawarelayout: "layout designed around the person/face",
  sceneawarelayout: "layout that respects the scene's real geometry and architecture",
  subjectcentered: "subject centered as the dominant element",
  environmentfirst: "environment/setting dominates over the subject",
  layeredcomposition: "layered composition with real depth",
  visualbreathing: "keep deliberate empty space — not everything needs to be filled",
} as const;

// Cómo se relaciona el texto con la fotografía (prompt v3, sección 17
// "ESTRATEGIAS DE TEXTO SOBRE IMAGEN").
const TEXT_STRATEGY_TAGS = {
  editorialoverlay: "editorial overlay: the photo stays the protagonist, the headline integrates without crushing it",
  narrativeoverlay: "narrative overlay: the message can unfold across a couple of blocks in the frame",
  minimaloverlay: "minimal overlay: the photo is already strong, barely touch it with text",
  naturaltextzone: "use a natural zone the photo already offers (light, dark, blur, negative space) — don't invent an artificial one",
  floatingcard: "place the message on a small floating card/container over the photo, sized to its content only",
} as const;

type BackgroundTag = keyof typeof BACKGROUND_TAGS;
type RetouchTag = keyof typeof RETOUCH_TAGS;
type DirectionTag = keyof typeof DIRECTION_TAGS;
type TextTag = keyof typeof TEXT_TAGS;
type BrandTag = keyof typeof BRAND_TAGS;
type CompositionTag = keyof typeof COMPOSITION_TAGS;
type TextStrategyTag = keyof typeof TEXT_STRATEGY_TAGS;

interface CreativeDecision {
  message: string;
  hasPeople: boolean;
  backgroundTag: BackgroundTag;
  retouchTag: RetouchTag;
  directionTag: DirectionTag;
  textTag: TextTag;
  compositionTag: CompositionTag;
  textStrategyTag: TextStrategyTag;
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
 * ANALIZAR → INTERPRETAR → SELECCIONAR STRINGS, en una sola llamada de
 * visión barata (gpt-4o-mini). Ve la foto OG real y decide el mensaje (la
 * necesidad humana detrás del artículo, no el título literal) y una
 * etiqueta corta por categoría — el artículo es "el cerebro conceptual", la
 * foto ya aporta toda la información visual, así que no hace falta
 * describirla de nuevo.
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
              "Eres un Director Creativo Senior de publicaciones para redes sociales. Ves una foto real y un artículo. El artículo es el cerebro conceptual (busca la necesidad humana detrás del tema, no la lectura superficial); la foto ya contiene toda la información visual, no hace falta describirla. La imagen OG es la materia prima principal: no se recrea desde cero lo que ya está bien resuelto, se transforma con criterio. Conserva lo bueno, mejora lo débil, transforma lo necesario, agrega solo lo que aporte — no todo necesita cambiar de fondo, ni retoque, ni texto grande. Decides qué transformar, no qué repetir. Respondes ÚNICAMENTE JSON válido.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `Título: ${articleTitle}\nResumen: ${articleSummary}\n¿Hay logo disponible?: ${hasLogo ? "sí" : "no"}\n\n` +
                  `JSON con exactamente estas claves:\n\n` +
                  `"message": frase corta en español, 3 a 9 palabras, basada en la necesidad humana real detrás del artículo (no el título literal). Ej: "Elegir bien también es cuidarte".\n\n` +
                  `"hasPeople": true/false, si la foto tiene personas.\n\n` +
                  `"backgroundTag": UNA clave. Si el fondo ya ayuda a contar la historia, consérvalo/mejóralo; solo reemplázalo si de verdad perjudica: ${Object.keys(BACKGROUND_TAGS).join(", ")}.\n\n` +
                  `"retouchTag": UNA clave. "none" si hasPeople es false: ${Object.keys(RETOUCH_TAGS).join(", ")}.\n\n` +
                  `"directionTag": UNA clave, la que mejor combine artículo + foto (no repitas siempre la misma): ${Object.keys(DIRECTION_TAGS).join(", ")}.\n\n` +
                  `"textTag": UNA clave, según Instagram Story, el tema, la emoción y el espacio que ves en la foto: ${Object.keys(TEXT_TAGS).join(", ")}.\n\n` +
                  `"compositionTag": UNA clave, cómo se organiza la pieza alrededor de lo que ya hay en la foto: ${Object.keys(COMPOSITION_TAGS).join(", ")}.\n\n` +
                  `"textStrategyTag": UNA clave, cómo se relaciona el texto con la fotografía — si la foto ya es fuerte, prefiere "minimaloverlay" o "naturaltextzone" en vez de inventar una zona nueva: ${Object.keys(TEXT_STRATEGY_TAGS).join(", ")}.\n\n` +
                  `"brandTags": arreglo de 0 a 2 claves, solo si hay logo (si no hay logo, []): ${Object.keys(BRAND_TAGS).join(", ")}.`,
              },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${ogBase64}` },
              },
            ],
          },
        ],
        max_tokens: 400,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CreativeDecision>;

    if (!parsed.message?.trim()) return null;
    if (typeof parsed.hasPeople !== "boolean") return null;
    if (!parsed.backgroundTag || !(parsed.backgroundTag in BACKGROUND_TAGS)) return null;
    if (!parsed.retouchTag || !(parsed.retouchTag in RETOUCH_TAGS)) return null;
    if (!parsed.directionTag || !(parsed.directionTag in DIRECTION_TAGS)) return null;
    if (!parsed.textTag || !(parsed.textTag in TEXT_TAGS)) return null;
    if (!parsed.compositionTag || !(parsed.compositionTag in COMPOSITION_TAGS)) return null;
    if (!parsed.textStrategyTag || !(parsed.textStrategyTag in TEXT_STRATEGY_TAGS)) return null;
    const brandTags = Array.isArray(parsed.brandTags)
      ? parsed.brandTags.filter((t): t is BrandTag => typeof t === "string" && t in BRAND_TAGS)
      : [];

    return {
      message: parsed.message.trim(),
      hasPeople: parsed.hasPeople,
      backgroundTag: parsed.backgroundTag,
      retouchTag: parsed.retouchTag,
      directionTag: parsed.directionTag,
      textTag: parsed.textTag,
      compositionTag: parsed.compositionTag,
      textStrategyTag: parsed.textStrategyTag,
      brandTags,
    };
  } catch {
    return null;
  }
}

/**
 * Ensambla el string final — corto, tipo receta, "/premiumeditorial
 * /backgroundluxury /complexionrefine /advertisingtext /instagram
 * /instagramstory /brandidentity /uselogo" del prompt de Milton, traducido
 * a instrucciones cortas en inglés más las reglas críticas no negociables
 * (texto dentro del cuadro, nunca sobre el rostro, logo nunca oculto ni
 * rediseñado). NO vuelve a describir la foto — la foto va como imagen de
 * referencia real en el mismo request.
 */
function buildEditPrompt(decision: CreativeDecision, hasLogo: boolean, hasPhotoRef: boolean): string {
  const tags = [
    DIRECTION_TAGS[decision.directionTag],
    COMPOSITION_TAGS[decision.compositionTag],
    BACKGROUND_TAGS[decision.backgroundTag],
    decision.hasPeople ? RETOUCH_TAGS[decision.retouchTag] : "",
    TEXT_STRATEGY_TAGS[decision.textStrategyTag],
    TEXT_TAGS[decision.textTag],
    ...decision.brandTags.map((t) => BRAND_TAGS[t]),
  ].filter(Boolean);

  return [
    "Transform this photo into a finished Instagram Story campaign image, as a senior creative director would — start from this exact photo, improve it, never a disconnected new composition. Don't recreate what already works; transform what's weak.",
    `Apply: ${tags.join("; ")}.`,
    `Headline text (Spanish): "${decision.message}"`,
    "TEXT SAFE ZONE, NON-NEGOTIABLE: the headline must fit entirely within the central 84% of the canvas width and 88% of the canvas height (an 8% empty margin on left/right, 6% on top/bottom, with nothing — no letter, stroke or serif — crossing into that margin). If the phrase is too long to fit at a comfortably readable size inside that safe zone, make the font smaller and/or break it into 2-3 shorter lines — never let it run past the safe zone, never shrink it to the point of being illegible either.",
    decision.hasPeople
      ? "ABSOLUTE RULE: the face is the highest-priority zone in the whole image — never cover eyes, nose, mouth or expression with text or anything else. Use empty/negative space instead."
      : "",
    "Keep any real people fully recognizable — same identity, age, proportions. Not every photo needs retouching or a different background — only change what genuinely needs it.",
    hasLogo
      ? "Leave a clean, empty, uncluttered rectangular area in the bottom-right corner (roughly the bottom-right 30% width x 10% height of the frame) with nothing important there — no text, no busy detail, no headline text overlapping it. A real logo will be placed there afterward by separate exact compositing, so do not draw, sketch or invent any logo or brand text yourself in that corner."
      : "",
    hasPhotoRef
      ? "A person reference photo is also included — incorporate them naturally and tastefully where it fits."
      : "",
    "Vertical full-bleed, no black bars. A powerful photo should not be over-designed. This must look like a professionally art-directed piece, not a photo with big text slapped on top.",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 4000);
}

/**
 * Genera la imagen de Instagram Story/Reel-image con IA, transformando (no
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
    // Calidad explícita (pedido de Milton por costo, 20/8/2026): "medium" en
    // vez del default "auto" (puede cobrar como "high"). Con
    // gpt-image-1-mini + medium queda en ~$0.015/imagen.
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
        `tags: ${decision.directionTag}/${decision.compositionTag}/${decision.backgroundTag}/${decision.retouchTag}/${decision.textStrategyTag}/${decision.textTag}` +
        `${decision.brandTags.length ? `/${decision.brandTags.join(",")}` : ""}` +
        `${logoPng ? " +logo" : ""}${photoPng ? " +foto" : ""}`,
    );
    return blob.url;
  } catch (err) {
    console.warn("[AI Image] Fallo generando imagen con IA:", err);
    return null;
  }
}
