// Generador de imágenes con IA para redes sociales ("Creador de Imágenes
// para Redes Sociales", 20/8/2026). Es un generador APARTE de los que ya
// existían (socialPublish.ts, businessProfilePublish.ts) — no los toca ni
// los reemplaza, por decisión explícita de Milton.
//
// Parte SIEMPRE de la imagen OG real del artículo (edición, no generación
// desde cero) y usa el logo/foto del usuario de forma variable, no siempre.
// Una sola generación por oportunidad: si algo falla en cualquier paso,
// devuelve null y quien llama debe cancelar la oportunidad — no hay
// reintento ni regeneración gratuita (decisión explícita, por costo).
//
// Usa una API key de OpenAI SEPARADA (OPENAI_IMAGE_API_KEY) de la que ya
// usa el resto de la plataforma, para poder medir/facturar este módulo
// aparte. Ver MASTER_BLUEPRINT_CREADOR_DE_IMAGENES.md en la raíz del repo.

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

/** Descarga una imagen y la normaliza a PNG, sin importar el formato de origen. */
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
 * Analiza el artículo y decide, vía IA, el mensaje corto (3-9 palabras) y la
 * dirección creativa (fondo, retoque, estilo) — el "ANALIZAR → DECIDIR" del
 * prompt original de Milton. Es una llamada de texto, barata; el costo real
 * está en la edición de imagen que viene después.
 */
async function decideCreativeDirection(
  articleTitle: string,
  articleSummary: string,
): Promise<{ message: string; direction: string } | null> {
  if (!OPENAI_IMAGE_API_KEY) return null;
  try {
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
              "Eres un director creativo de publicaciones para redes sociales. Analizas un artículo y decides la dirección visual de una imagen que se va a generar editando la foto del artículo. Respondes ÚNICAMENTE JSON válido.",
          },
          {
            role: "user",
            content:
              `Título: ${articleTitle}\nResumen: ${articleSummary}\n\n` +
              `Devuelve JSON con exactamente estas claves:\n` +
              `"message": frase corta y poderosa en español, de 3 a 9 palabras, humana y emocional, conectada con la necesidad o el beneficio real del lector. No copies el título literal.\n` +
              `"direction": en inglés, 2 o 3 frases describiendo fondo, iluminación, estilo de retoque (sutil, nunca "plástico") y dirección creativa (ej. cinematic, editorial, premium) para convertir la foto del artículo en una pieza de campaña profesional, manteniendo reconocibles a las personas si las hay.`,
          },
        ],
        max_tokens: 300,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { message?: string; direction?: string };
    if (!parsed.message?.trim() || !parsed.direction?.trim()) return null;
    return { message: parsed.message.trim(), direction: parsed.direction.trim() };
  } catch {
    return null;
  }
}

function buildEditPrompt(direction: string, message: string, includesExtraRefs: boolean): string {
  return [
    "Edit this photo into a finished, professional social media campaign image ready to publish on Instagram.",
    direction,
    includesExtraRefs
      ? "Additional reference images are provided (brand logo and/or a person's photo) — incorporate them naturally and tastefully only where it visually fits, without forcing them into the composition."
      : "",
    `Overlay this short headline text, in Spanish, large and perfectly legible, well composed within the frame: "${message}"`,
    "Keep any real people from the base photo clearly recognizable — do not change their identity, age or proportions. Retouch subtly, never plastic-looking skin.",
    "If a logo reference image is included, preserve its exact colors and shape — do not redesign it, place it small and naturally, respecting brand identity.",
    "Vertical full-bleed composition, no black bars, no added watermarks besides the provided logo.",
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

  const creative = await decideCreativeDirection(params.articleTitle, params.articleSummary);
  if (!creative) return null;

  // Decisión aleatoria e independiente entre sí: no siempre se usan, para
  // que las imágenes no se vean todas iguales (pedido explícito de Milton).
  const useLogo = Boolean(params.businessLogoUrl) && Math.random() < 0.6;
  const usePhoto = Boolean(params.profilePhotoUrl) && Math.random() < 0.3;

  const refImages: Buffer[] = [ogPng];
  if (useLogo && params.businessLogoUrl) {
    const logoPng = await fetchImageAsPng(params.businessLogoUrl);
    if (logoPng) refImages.push(logoPng);
  }
  if (usePhoto && params.profilePhotoUrl) {
    const photoPng = await fetchImageAsPng(params.profilePhotoUrl);
    if (photoPng) refImages.push(photoPng);
  }

  const prompt = buildEditPrompt(creative.direction, creative.message, refImages.length > 1);

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
    // peso — con PNG llegó a agotar el tiempo de espera de
    // pollMediaContainerStatus (60s) al publicar. JPEG calidad 90 pesa una
    // fracción de eso sin pérdida visible para una publicación de redes.
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

    console.log(`[AI Image] Generada: ${blob.url} (${(finalBuffer.length / 1024).toFixed(0)}KB)`);
    return blob.url;
  } catch (err) {
    console.warn("[AI Image] Fallo generando imagen con IA:", err);
    return null;
  }
}
