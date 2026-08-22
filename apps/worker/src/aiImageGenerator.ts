// Generador de imágenes con IA para redes sociales ("Creador de Imágenes
// para Redes Sociales", 20/8/2026). Es un generador APARTE de los que ya
// existían (socialPublish.ts, businessProfilePublish.ts) — no los toca ni
// los reemplaza, por decisión explícita de Milton.
//
// El prompt del director creativo lo edita Milton desde el panel de admin
// (pestaña "Prompts", ver getCustomSystemPrompt más abajo) y CONTROLA de
// verdad la imagen final. Rediseño 22/8/2026: la salida ya no es JSON con
// un párrafo largo (`visualPrompt`) — es UNA SOLA LÍNEA de texto plano,
// "/etiqueta /etiqueta ... TEXT: mensaje exacto", tomada de un catálogo
// cerrado de etiquetas que define el propio prompt de Milton. Confirmado
// en vivo por Milton comparando contra una prueba manual en ChatGPT
// Images: el mismo mecanismo corto (tags + texto) dio resultados
// notablemente mejores que el prompt largo con instrucciones detalladas
// de posición/tamaño/porcentajes — menos instrucciones simultáneas,
// mejor resultado. Ese string de etiquetas ES la instrucción visual real
// que recibe el generador de imagen, sin que este código la expanda ni
// reescriba (ver buildEditPrompt).
//
// La imagen OG se le pasa DIRECTO a la IA como materia prima principal (no
// hace falta describirla en texto). Una sola generación por oportunidad: si
// algo falla en cualquier paso, devuelve null y quien llama debe cancelar la
// oportunidad — no hay reintento ni regeneración gratuita (decisión
// explícita, por costo).
//
// Usa una API key de OpenAI SEPARADA (OPENAI_IMAGE_API_KEY) de la que ya
// usa el resto de la plataforma — pero solo para decidir el mensaje/
// etiquetas (gpt-4o-mini, siempre). La generación de la imagen en sí usa
// el proveedor de IMAGE_PROVIDER (22/8/2026): "openai" (default) llama a
// gpt-image-1-mini vía images/edits (~$0.005-0.015/imagen); "fal" usa
// Ideogram V3 Remix vía fal.ai (~$0.03/imagen, TURBO) — adoptado porque
// gpt-image-1-mini corrompe letras en español incluso con prompts cortos
// y limpios, confirmado en vivo el 22/8/2026.

import sharp from "sharp";
import { put } from "@vercel/blob";
import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";

const OPENAI_IMAGE_API_KEY = process.env.OPENAI_IMAGE_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_EDIT_URL = "https://api.openai.com/v1/images/edits";

// Mismo adaptador de proveedor que ya existía en promptBoxPipeline.ts —
// duplicado acá a propósito, sin importar de ese archivo, porque ese
// pipeline está pausado y pendiente de borrado seguro (ver COORDINACION
// 22/8/2026); este archivo no debe depender de código que puede
// desaparecer. Confirmado en vivo (22/8/2026, cuenta de Lorena) que
// gpt-image-1-mini corrompe letras en español incluso con un prompt
// corto y limpio — la misma falla de texto que llevó a adoptar fal.ai/
// Ideogram en el pipeline de 8 cajas, así que se activa acá también.
const FAL_API_KEY = process.env.FAL_API_KEY;
const FAL_IDEOGRAM_REMIX_URL = "https://fal.run/fal-ai/ideogram/v3/remix";
const IMAGE_PROVIDER = (process.env.IMAGE_PROVIDER || "openai").toLowerCase();

async function generateImageBufferFal(
  prompt: string,
  ogImageUrl: string,
  width: number,
  height: number,
  logoUrl?: string | null,
): Promise<Buffer | null> {
  if (!FAL_API_KEY) return null;
  const body: Record<string, unknown> = {
    prompt: prompt.slice(0, 4000),
    image_url: ogImageUrl,
    image_size: { width, height },
    rendering_speed: "TURBO",
    // Confirmado en la documentación oficial de fal.ai/Ideogram (22/8/2026),
    // tras una prueba real donde el texto salió minúsculo y deformado:
    // "expand_prompt" (MagicPrompt) reescribe el prompt antes de generar —
    // puede estar distorsionando el texto exacto entre comillas — así que
    // se apaga para tener control literal.
    expand_prompt: false,
  };
  // Pedido explícito de Milton (22/8/2026): en vez de reservarle espacio al
  // logo con una frase de texto aparte y pegarlo después con código, se le
  // manda el logo real como material de referencia (fal.ai lo trata como
  // "style reference", no como objeto exacto a calcar) y el propio modelo
  // decide cómo incorporarlo. Por eso este archivo YA NO compone el logo
  // con compositeLogo() cuando el proveedor es fal — ver generateAiSocialImage.
  //
  // "style: DESIGN" (el preset que Ideogram documenta para tipografía) solo
  // se manda cuando NO hay logo — la API de fal.ai la rechaza con error 422
  // cuando también se envían `image_urls`: "`style` cannot be 'DESIGN' when
  // `image_urls` are provided." Confirmado en vivo el 22/8/2026 (falló la
  // generación completa). Con logo, se deja sin `style` (default de fal.ai).
  if (logoUrl) {
    body.image_urls = [logoUrl];
  } else {
    body.style = "DESIGN";
  }
  const res = await fetch(FAL_IDEOGRAM_REMIX_URL, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`fal.ai HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = (await res.json()) as { images?: { url?: string }[] };
  const resultUrl = data.images?.[0]?.url;
  if (!resultUrl) throw new Error(`fal.ai: respuesta sin imagen: ${JSON.stringify(data).slice(0, 500)}`);
  const imgRes = await fetch(resultUrl, { signal: AbortSignal.timeout(30000) });
  if (!imgRes.ok) return null;
  return Buffer.from(await imgRes.arrayBuffer());
}

// Tercer proveedor (22/8/2026, pedido de Milton tras 3 fallas distintas de
// Ideogram en pruebas reales): Nano Banana (Gemini de Google) vía fal.ai.
// A diferencia de Ideogram (difusión pura, sin capa de lenguaje), Nano
// Banana es un modelo nativo de LLM multimodal — arquitectura más parecida
// a ChatGPT Images (donde el prompt de etiquetas SÍ funcionó bien en la
// prueba manual de Milton) que a un modelo de difusión clásico. Su endpoint
// de edición acepta varias imágenes de referencia a la vez, así que el OG y
// el logo van juntos en `image_urls` — mismo mecanismo de "el modelo decide
// cómo usarlas" que se le pidió a Ideogram, pero es el caso de uso nativo
// de este endpoint, no un uso secundario ("style reference").
const FAL_NANO_BANANA_EDIT_URL = "https://fal.run/fal-ai/nano-banana/edit";

async function generateImageBufferNanoBanana(
  prompt: string,
  ogImageUrl: string,
  width: number,
  height: number,
  logoUrl?: string | null,
): Promise<Buffer | null> {
  if (!FAL_API_KEY) return null;
  const imageUrls = [ogImageUrl];
  if (logoUrl) imageUrls.push(logoUrl);
  // Nano Banana no acepta ancho/alto exactos como Ideogram, solo un preset
  // de relación de aspecto — se mapea desde las dimensiones reales del
  // formato (FORMAT_TARGET más abajo solo usa 9:16 y 4:5 hoy).
  const ratio = width / height;
  const aspectRatio =
    Math.abs(ratio - 1) < 0.02
      ? "1:1"
      : Math.abs(ratio - 9 / 16) < 0.02
        ? "9:16"
        : Math.abs(ratio - 4 / 5) < 0.02
          ? "4:5"
          : "auto";
  const res = await fetch(FAL_NANO_BANANA_EDIT_URL, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: prompt.slice(0, 4000),
      image_urls: imageUrls,
      aspect_ratio: aspectRatio,
      output_format: "jpeg",
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`fal.ai (nano-banana) HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = (await res.json()) as { images?: { url?: string }[] };
  const resultUrl = data.images?.[0]?.url;
  if (!resultUrl) throw new Error(`fal.ai (nano-banana): respuesta sin imagen: ${JSON.stringify(data).slice(0, 500)}`);
  const imgRes = await fetch(resultUrl, { signal: AbortSignal.timeout(30000) });
  if (!imgRes.ok) return null;
  return Buffer.from(await imgRes.arrayBuffer());
}

export type AiImageFormat = "story" | "reel-image" | "post" | "facebook-story";

// Tamaño que se le pide a gpt-image-1-mini (solo soporta 1024x1024,
// 1024x1536, 1536x1024) y tamaño final real al que se recorta después con
// sharp. "post" usa 4:5 (1080x1350), el formato de feed que más espacio
// ocupa en pantalla — recomendado hoy por Instagram. "facebook-story" es
// igual de vertical que la Historia de Instagram (9:16). Cuando este
// módulo cubra más redes, este mapa crece.
const FORMAT_TARGET: Record<AiImageFormat, { editSize: "1024x1536"; width: number; height: number }> = {
  story: { editSize: "1024x1536", width: 1080, height: 1920 },
  "reel-image": { editSize: "1024x1536", width: 1080, height: 1920 },
  post: { editSize: "1024x1536", width: 1080, height: 1350 },
  "facebook-story": { editSize: "1024x1536", width: 1080, height: 1920 },
};

const FORMAT_LABEL: Record<AiImageFormat, string> = {
  story: "Instagram Story",
  "reel-image": "Instagram Reel cover",
  post: "Instagram feed post",
  "facebook-story": "Facebook Story",
};

// Rediseño 22/8/2026 (pedido explícito de Milton, tras comparar en vivo
// contra una prueba manual en ChatGPT Images): el prompt largo tipo JSON
// con `visualPrompt` de párrafo completo se abandona — un prompt corto de
// etiquetas + texto exacto dio resultados notablemente mejores. La Caja
// de Director Creativo ahora responde UNA SOLA LÍNEA de texto plano:
// "/etiqueta /etiqueta ... TEXT: mensaje exacto" — ni JSON ni párrafo.
interface CreativeDecision {
  /** La línea completa tal cual la devolvió el modelo: "/tag /tag ... TEXT: mensaje". */
  visualLine: string;
  /** Solo la parte de etiquetas, antes de "TEXT:" — usada nada más para logging. */
  tagString: string;
  /** Solo el mensaje exacto, después de "TEXT:". */
  message: string;
}

// Mismo key que apps/web/src/lib/ai-image-prompt.ts — Milton pidió (20/8/2026)
// poder editar el prompt del director creativo desde el panel de admin
// (pestaña "Prompts") sin depender de un redeploy de código. Guardado
// global (no por usuario) en SystemSetting, igual que otras settings
// globales del sistema.
const AI_IMAGE_PROMPT_KEY = "ai_social_image_prompt";

// Respaldo mínimo solo por si el admin borra el prompt personalizado sin
// querer — Milton siempre tiene uno guardado en el panel, este default
// prácticamente nunca se usa en la práctica. Debe mantener el mismo
// contrato de salida (una línea, tags + TEXT) que el prompt real.
const DEFAULT_SYSTEM_PROMPT =
  "Eres un Director Creativo Senior de publicaciones para redes sociales. Ves una foto real (imagen OG) y un artículo. Decide el mensaje corto más relevante para la imagen y elige etiquetas de estilo visual coherentes. Responde ÚNICAMENTE con una línea de texto plano, sin JSON ni explicación, con este formato exacto: /etiqueta /etiqueta /etiqueta ... TEXT: mensaje exacto";

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

export async function fetchImageAsPng(url: string): Promise<Buffer | null> {
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
export async function removeNearWhiteBackground(png: Buffer, threshold = 245): Promise<Buffer> {
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
export async function compositeLogo(base: Buffer, width: number, height: number, logoPng: Buffer): Promise<Buffer> {
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
 * ANALIZAR → DECIDIR, en una sola llamada de visión barata (gpt-4o-mini),
 * con el prompt de Milton (editable en el panel admin) como system
 * message. El propio prompt de Milton dicta el formato de salida exacto
 * (una línea de texto plano: "/etiqueta /etiqueta ... TEXT: mensaje") —
 * el código ya NO le pide JSON ni le agrega instrucciones de formato
 * encima de las suyas. Rediseño 22/8/2026: el prompt anterior (JSON con
 * un campo `visualPrompt` de párrafo largo) daba resultados peores en
 * pruebas reales que un prompt corto de etiquetas — confirmado por Milton
 * comparando en vivo contra ChatGPT Images con el mismo mecanismo.
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
        messages: [
          {
            role: "system",
            content: customPrompt || DEFAULT_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  // formatLabel ya incluye la red social correcta ("Instagram
                  // Story", "Facebook Story", etc.) — antes decía "Instagram"
                  // hardcodeado ADEMÁS del label, contradiciéndolo para
                  // Facebook Story ("Instagram, Facebook Story"). Mismo bug
                  // encontrado y corregido en promptBoxPipeline.ts, 21/8/2026.
                  `Red social y formato: ${formatLabel}.\n` +
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
        max_tokens: 300,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;

    // Formato del prompt del admin (22/8/2026): "/tag /tag ... with
    // high-contrast [estilo] text that reads: "mensaje exacto"" — el
    // mensaje va citado, no después de "TEXT:". Se intenta ese patrón
    // primero; si el prompt vuelve a usar el formato viejo ("TEXT:
    // mensaje"), sigue funcionando como respaldo. Comillas rectas o
    // tipográficas, ambas válidas. Si ninguno matchea, se descarta en vez
    // de adivinar.
    const quotedMatch = raw.match(/^(.*?)text that reads:\s*["“]([^"”]+)["”]/is);
    const legacyMatch = quotedMatch ? null : raw.match(/^(.*?)\s*TEXT:\s*(.+)$/is);
    const match = quotedMatch || legacyMatch;
    if (!match) return null;
    const tagString = match[1].trim();
    const message = match[2].trim();
    if (!tagString || !message) return null;

    return { visualLine: raw, tagString, message };
  } catch {
    return null;
  }
}

/**
 * Toma la línea que armó el propio modelo ("/tag /tag ... TEXT: mensaje").
 *
 * Camino OpenAI: le agrega SOLO lo que el prompt de Milton no puede
 * cubrir porque depende de decisiones de este código — que no tape el
 * rostro, y que quede espacio para el logo real (que se pega después con
 * compositeLogo). Frases estables, siempre las mismas.
 *
 * Caminos fal.ai/Ideogram y fal.ai/Nano Banana (pedido explícito de
 * Milton, 22/8/2026): CERO capas encima del prompt del admin — se manda
 * `decision.visualLine` tal cual lo devolvió el modelo, sin agregar,
 * traducir ni reescribir nada desde código. Si el proveedor necesita otro
 * formato de texto, ese ajuste va en el prompt del admin, no acá. El logo
 * tampoco se resuelve con una frase de texto ni se compone después por
 * código: se manda como material de referencia (`image_urls`) y el
 * propio modelo decide cómo incorporarlo.
 */
function buildEditPrompt(
  decision: CreativeDecision,
  hasLogo: boolean,
  hasPhotoRef: boolean,
  provider: "openai" | "fal" | "nano",
): string {
  if (provider === "fal" || provider === "nano") {
    return decision.visualLine;
  }
  return [
    decision.visualLine,
    "ABSOLUTE RULE: if the photo contains a person, the face is the highest-priority zone in the whole image — never cover eyes, nose, mouth or expression with text or anything else. Use empty/negative space instead.",
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
 * Genera la imagen (Instagram Story/Reel/Post o Facebook Story) con IA,
 * transformando (no copiando ni generando desconectado) la imagen OG del
 * artículo. Devuelve null si CUALQUIER paso falla — quien llama debe
 * cancelar la oportunidad, no publicar sin imagen ni reintentar.
 */
export interface AiImageResult {
  imageUrl: string;
  // Prompt exacto (línea cruda, sin modificar) que se le mandó al
  // generador de imagen — pedido explícito de Milton (22/8/2026) para
  // poder verlo en el histórico sin reconstruirlo desde los logs.
  prompt: string;
}

export async function generateAiSocialImage(params: {
  articleTitle: string;
  articleSummary: string;
  ogImageUrl: string;
  format: AiImageFormat;
  businessLogoUrl?: string | null;
  profilePhotoUrl?: string | null;
  pathPrefix: string;
}): Promise<AiImageResult | null> {
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

  // Camino OpenAI: el logo NUNCA se le pasa a la IA como referencia a
  // dibujar (probado en vivo: lo cortaba/deformaba pese a instrucciones
  // explícitas) — se pega aparte, después, con código exacto. Solo la OG
  // y la foto de perfil (cuando aplica) van como referencias reales.
  // Caminos fal.ai/Nano Banana: distinto a propósito (pedido de Milton) —
  // el logo SÍ se manda como material de referencia, y el modelo decide
  // cómo usarlo.
  const refImages = [ogPng, photoPng].filter((b): b is Buffer => b !== null);
  const providerLabel: "openai" | "fal" | "nano" =
    IMAGE_PROVIDER === "fal" ? "fal" : IMAGE_PROVIDER === "nano" ? "nano" : "openai";
  const prompt = buildEditPrompt(decision, Boolean(logoPng), Boolean(photoPng), providerLabel);

  try {
    // Proveedor de la Caja de generación de imagen — mismo switch que
    // promptBoxPipeline.ts (env var IMAGE_PROVIDER, ya configurada en los
    // 3 workflows). "fal" usa Ideogram V3 Remix; "nano" usa Nano Banana
    // (Gemini) — agregado 22/8/2026 tras 3 fallas distintas de Ideogram en
    // pruebas reales (sin texto, texto deforme, imagen sin relación con la
    // OG). Nano Banana es un modelo nativo de LLM multimodal, arquitectura
    // más parecida a ChatGPT Images (donde el prompt de etiquetas sí
    // funcionó en la prueba manual de Milton) que a un modelo de difusión
    // puro como Ideogram.
    let rawOutput: Buffer | null;
    if (providerLabel === "fal") {
      rawOutput = await generateImageBufferFal(prompt, params.ogImageUrl, target.width, target.height, params.businessLogoUrl);
    } else if (providerLabel === "nano") {
      rawOutput = await generateImageBufferNanoBanana(prompt, params.ogImageUrl, target.width, target.height, params.businessLogoUrl);
    } else {
      const form = new FormData();
      form.append("model", "gpt-image-1-mini");
      form.append("prompt", prompt);
      form.append("size", target.editSize);
      // Calidad explícita (pedido de Milton por costo, 20/8/2026): "auto"
      // default puede cobrar como "high" ($0.25). Ya se probaron "low"
      // (~$0.005) y "medium" (~$0.015) — de vuelta a "low" a pedido de
      // Milton, ahora que el texto ya no fuerza tamaño grande (el prompt de
      // Milton controla eso), puede ya alcanzar con menos calidad.
      form.append("quality", "low");
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
      rawOutput = b64 ? Buffer.from(b64, "base64") : null;
    }
    if (!rawOutput) return null;

    const resized = await sharp(rawOutput)
      .resize(target.width, target.height, { fit: "cover", position: "attention" })
      .toBuffer();
    // Con fal.ai/Nano Banana el logo ya se le mandó al modelo como material
    // de referencia — no se vuelve a pegar por código encima, para no
    // terminar con dos logos superpuestos.
    const withLogo =
      logoPng && providerLabel === "openai" ? await compositeLogo(resized, target.width, target.height, logoPng) : resized;

    // JPEG en vez de PNG: los generadores devuelven PNG pesado, e Instagram
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
      `[AI Image] Generada con ${providerLabel === "fal" ? "fal-ai/ideogram-v3-remix" : providerLabel === "nano" ? "fal-ai/nano-banana" : "gpt-image-1-mini"}: ${blob.url} (${(finalBuffer.length / 1024).toFixed(0)}KB) — ` +
        `etiquetas: ${decision.tagString} — texto: "${decision.message}"` +
        `${logoPng ? " +logo" : ""}${photoPng ? " +foto" : ""}`,
    );
    return { imageUrl: blob.url, prompt };
  } catch (err) {
    console.warn("[AI Image] Fallo generando imagen con IA:", err);
    return null;
  }
}
