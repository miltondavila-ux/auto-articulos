// Motor de ejecución del sistema de "Cajas de Imágenes IA" (20/8/2026,
// especificación de Milton): 8 prompts encadenados y editables desde el
// admin, en vez de un solo prompt gigante. Cada caja recibe el contexto de
// las anteriores y agrega su propia decisión — Analista de Contenido →
// Director Creativo → Diseñador de Composición → Editor de Texto Visual →
// Constructor del Prompt Visual → Generador de Imagen → Inspector de
// Calidad → Corrector Automático (con reintento hasta MAX_RETRIES si el
// Inspector rechaza).
//
// APARTE del generador actual (aiImageGenerator.ts) — no lo reemplaza ni lo
// toca. Solo se usa cuando el usuario tiene `usePromptBoxPipeline` activo
// (y `aiImageGenerationEnabled`), pedido explícito de Milton para probar en
// paralelo sin arriesgar lo que ya funciona.
//
// Cada corrida de cada caja se guarda en PromptBoxExecution — de ahí sale
// el bloque "Ver última ejecución" del panel de administración.

import sharp from "sharp";
import { put } from "@vercel/blob";
import { prisma } from "@auto-articulos/db";
import { fetchImageAsPng, compositeLogo } from "./aiImageGenerator";

const OPENAI_IMAGE_API_KEY = process.env.OPENAI_IMAGE_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_EDIT_URL = "https://api.openai.com/v1/images/edits";

const FAL_API_KEY = process.env.FAL_API_KEY;
const FAL_IDEOGRAM_REMIX_URL = "https://fal.run/fal-ai/ideogram/v3/remix";
const FAL_GPT_IMAGE_2_EDIT_URL = "https://fal.run/openai/gpt-image-2/edit";

// Adaptador de proveedor para la Caja 6 (pedido explícito de Milton: "la
// arquitectura debe permitir cambiar de proveedor... sin tocar las cajas
// anteriores"). "openai" (default) usa gpt-image-1-mini; "fal" usa Ideogram
// V3 Remix vía fal.ai, conocido por mejor fidelidad de texto incrustado —
// prueba puntual del 21/8/2026 tras 9/9 pruebas reales fallidas con OpenAI.
const IMAGE_PROVIDER = (process.env.IMAGE_PROVIDER || "openai").toLowerCase();

// Vuelto a 2 (21/8/2026): confirmado que la cuenta de fal.ai funciona y el
// costo por intento es bajo (~$0.03 en TURBO) — vuelve al diseño original
// con margen de autocorrección en vez de cancelar directo al primer
// rechazo del Inspector.
const MAX_RETRIES = 2;

type Format = "story" | "reel-image" | "post" | "facebook-story";

async function generateImageBufferOpenAI(prompt: string, refImages: Buffer[]): Promise<Buffer | null> {
  const form = new FormData();
  form.append("model", "gpt-image-1-mini");
  form.append("prompt", prompt.slice(0, 4000));
  form.append("size", "1024x1536");
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
    throw new Error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = data.data?.[0]?.b64_json;
  return b64 ? Buffer.from(b64, "base64") : null;
}

async function generateImageBufferFal(
  prompt: string,
  ogImageUrl: string,
  width: number,
  height: number,
): Promise<Buffer | null> {
  if (!FAL_API_KEY) return null;
  const res = await fetch(FAL_IDEOGRAM_REMIX_URL, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: prompt.slice(0, 4000),
      image_url: ogImageUrl,
      // Ancho/alto EXACTOS en píxeles (21/8/2026, auditoría tras detectar
      // que el recorte automático de después — sharp fit:"cover" — podía
      // cortar texto ubicado cerca de un borde lateral cuando el tamaño
      // generado no coincidía con el tamaño final de Instagram. Pedir el
      // tamaño exacto acá elimina la necesidad de recortar nada después.
      image_size: { width, height },
      // TURBO = ~$0.03/intento (el más barato) — punto de partida acordado
      // con Milton para la primera prueba real, antes de considerar
      // BALANCED ($0.06) o QUALITY ($0.09) si hiciera falta más fidelidad.
      rendering_speed: "TURBO",
    }),
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

async function generateImageBufferGptImage2(
  prompt: string,
  ogImageUrl: string,
  width: number,
  height: number,
  logoImageUrl?: string | null,
): Promise<Buffer | null> {
  if (!FAL_API_KEY) return null;
  const imageUrls = [ogImageUrl];
  if (logoImageUrl) imageUrls.push(logoImageUrl);
  const apiWidth = Math.ceil(width / 16) * 16;
  const apiHeight = Math.ceil(height / 16) * 16;
  const res = await fetch(FAL_GPT_IMAGE_2_EDIT_URL, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: prompt.slice(0, 4000),
      image_urls: imageUrls,
      image_size: { width: apiWidth, height: apiHeight },
      quality: "medium",
      num_images: 1,
      output_format: "jpeg",
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`fal.ai (gpt-image-2) HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = (await res.json()) as { images?: { url?: string }[] };
  const resultUrl = data.images?.[0]?.url;
  if (!resultUrl) throw new Error(`fal.ai (gpt-image-2): respuesta sin imagen: ${JSON.stringify(data).slice(0, 500)}`);
  const imgRes = await fetch(resultUrl, { signal: AbortSignal.timeout(30000) });
  if (!imgRes.ok) return null;
  return Buffer.from(await imgRes.arrayBuffer());
}

const FORMAT_TARGET: Record<Format, { width: number; height: number; label: string }> = {
  story: { width: 1080, height: 1920, label: "Instagram Story" },
  "reel-image": { width: 1080, height: 1920, label: "Instagram Reel cover" },
  post: { width: 1080, height: 1350, label: "Instagram feed post" },
  "facebook-story": { width: 1080, height: 1920, label: "Facebook Story" },
};

interface PromptBoxRow {
  id: string;
  slug: string;
  systemPrompt: string;
  isActive: boolean;
}

async function recordExecution(
  promptBoxId: string,
  input: unknown,
  output: string | null,
  model: string | null,
  startedAt: number,
  error: string | null,
): Promise<void> {
  try {
    await prisma.promptBoxExecution.create({
      data: {
        promptBoxId,
        input: typeof input === "string" ? input.slice(0, 8000) : JSON.stringify(input).slice(0, 8000),
        output: output ? output.slice(0, 8000) : null,
        model,
        durationMs: Date.now() - startedAt,
        error,
      },
    });
  } catch (err) {
    console.warn("[PromptBox] No se pudo registrar la ejecución:", err);
  }
}

/** Llama a una caja de texto (gpt-4o-mini) con su prompt guardado como system message. */
async function runTextBox(
  box: PromptBoxRow,
  userText: string,
  imagesBase64?: (string | null | undefined)[],
): Promise<string | null> {
  if (!OPENAI_IMAGE_API_KEY) return null;
  const started = Date.now();
  const userContent: Array<Record<string, unknown>> = [{ type: "text", text: userText }];
  for (const img of imagesBase64 ?? []) {
    if (img) userContent.push({ type: "image_url", image_url: { url: `data:image/png;base64,${img}` } });
  }
  try {
    const res = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_IMAGE_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: box.systemPrompt },
          { role: "user", content: userContent },
        ],
        // Las cajas devuelven JSON rico y detallado (varios cientos de
        // tokens); 1200 se quedaba corto y truncaba el JSON a la mitad,
        // dejándolo inválido para JSON.parse.
        max_tokens: 3000,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      await recordExecution(box.id, userText, null, "gpt-4o-mini", started, `HTTP ${res.status}: ${errText.slice(0, 300)}`);
      return null;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const output = data.choices?.[0]?.message?.content?.trim() || null;
    await recordExecution(box.id, userText, output, "gpt-4o-mini", started, output ? null : "Sin contenido en la respuesta");
    return output;
  } catch (err) {
    await recordExecution(box.id, userText, null, "gpt-4o-mini", started, err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Las Cajas 5 y 8 devuelven un objeto JSON rico (no solo el texto del
 * prompt), con el prompt de generación real escondido en un campo interno
 * (`generation_prompt`, `corrected_generation_prompt`, etc. — el nombre
 * exacto varía). Buscar cualquier campo cuyo nombre contenga "prompt" con
 * un valor de texto suficientemente largo evita mandarle a la API de
 * imágenes el JSON completo (llaves, "next_action", "preserve", etc.) como
 * si fuera el prompt en sí — eso es lo que generaba texto cortado: la
 * instrucción real quedaba diluida en ruido estructural.
 */
function findPromptField(value: unknown, depth = 0): string | null {
  return findFieldByPattern(value, /prompt/i, 60, depth);
}

/**
 * Busca el primer campo string cuyo NOMBRE coincida con el patrón dado, en
 * cualquier profundidad del objeto — genérico, reutilizado tanto para
 * ubicar el prompt de generación (findPromptField) como para extraer datos
 * puntuales de las cajas (modelo conceptual, composición, etc. para
 * CreativeGenerationHistory).
 */
function findFieldByPattern(value: unknown, keyPattern: RegExp, minLength = 1, depth = 0): string | null {
  if (depth > 5 || value == null || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFieldByPattern(item, keyPattern, minLength, depth + 1);
      if (found) return found;
    }
    return null;
  }
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (typeof val === "string" && keyPattern.test(key) && val.trim().length >= minLength) {
      return val.trim();
    }
  }
  for (const val of Object.values(value as Record<string, unknown>)) {
    const found = findFieldByPattern(val, keyPattern, minLength, depth + 1);
    if (found) return found;
  }
  return null;
}

/**
 * Igual que findFieldByPattern pero para valores numéricos — usado para
 * extraer los límites medibles de headline (`headline_max_canvas_height_percent`,
 * `new_target_max_canvas_height_percent`, etc.) que las Cajas 5/7/8 acordaron
 * usar como "fuente de verdad" compartida en vez de instrucciones cualitativas
 * ("headline pequeño/mediano") — rediseño de Milton 22/8/2026 para que
 * Generador e Inspector "hablen el mismo idioma numérico" y dejen de
 * rechazarse en un loop sin converger.
 */
function findNumberByPattern(value: unknown, keyPattern: RegExp, depth = 0): number | null {
  if (depth > 5 || value == null || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNumberByPattern(item, keyPattern, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (typeof val === "number" && keyPattern.test(key)) return val;
  }
  for (const val of Object.values(value as Record<string, unknown>)) {
    const found = findNumberByPattern(val, keyPattern, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

/**
 * Respaldo cuando el JSON llega inválido (p.ej. truncado a mitad de
 * generación): busca directamente con regex un campo "...prompt": "..."
 * y decodifica sus escapes reutilizando JSON.parse sobre el string aislado.
 * Sirve mientras ese campo específico haya terminado de generarse antes
 * del corte, aunque el resto del JSON no haya cerrado bien.
 */
function extractPromptFieldViaRegex(raw: string): string | null {
  const match = raw.match(/"[a-zA-Z_]*prompt[a-zA-Z_]*"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
  if (!match) return null;
  try {
    return JSON.parse(`"${match[1]}"`);
  } catch {
    return match[1];
  }
}

/**
 * Respaldo de última instancia cuando ningún campo del JSON coincide con
 * /prompt/i en el nombre — busca el string más largo en todo el árbol,
 * asumiendo que el texto de generación real es, con mucha probabilidad,
 * el bloque de texto más extenso del objeto, sin importar cómo se llame
 * el campo esa vez (el nombre exacto puede variar según cómo redacte
 * cada respuesta el modelo).
 */
function findLongestString(value: unknown, depth = 0): string | null {
  if (depth > 5 || value == null) return null;
  if (typeof value === "string") return value.trim().length > 60 ? value.trim() : null;
  if (Array.isArray(value)) {
    let best: string | null = null;
    for (const item of value) {
      const found = findLongestString(item, depth + 1);
      if (found && (!best || found.length > best.length)) best = found;
    }
    return best;
  }
  if (typeof value === "object") {
    let best: string | null = null;
    for (const val of Object.values(value as Record<string, unknown>)) {
      const found = findLongestString(val, depth + 1);
      if (found && (!best || found.length > best.length)) best = found;
    }
    return best;
  }
  return null;
}

function extractVisualPrompt(raw: string, debugLabel: string): string {
  try {
    const parsed = JSON.parse(raw);
    const found = findPromptField(parsed) ?? findLongestString(parsed);
    if (found) return found;
    console.warn(`[PromptBoxPipeline] ${debugLabel}: JSON válido pero no se encontró ningún campo de texto usable — output completo: ${raw.slice(0, 3000)}`);
  } catch {
    const viaRegex = extractPromptFieldViaRegex(raw);
    if (viaRegex && viaRegex.trim().length > 60) return viaRegex.trim();
    console.warn(`[PromptBoxPipeline] ${debugLabel}: no era JSON válido ni se pudo rescatar por regex — output completo: ${raw.slice(0, 3000)}`);
  }
  return raw;
}

/**
 * El veredicto real puede venir anidado a cualquier profundidad (p.ej.
 * `quality_inspection.status`, no `status` en la raíz) — busca cualquier
 * campo "status" con "approved"/"rejected" o "publish_ready" booleano en
 * cualquier nivel, en vez de asumir una posición fija.
 */
function findApprovalSignal(value: unknown, depth = 0): boolean | null {
  if (depth > 5 || value == null || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findApprovalSignal(item, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }
  const obj = value as Record<string, unknown>;
  for (const [key, val] of Object.entries(obj)) {
    if (/^status$/i.test(key) && typeof val === "string") {
      const lower = val.toLowerCase();
      if (lower.includes("approv")) return true;
      if (lower.includes("reject")) return false;
    }
    if (/publish_?ready/i.test(key) && typeof val === "boolean") return val;
  }
  for (const val of Object.values(obj)) {
    const found = findApprovalSignal(val, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

/** Convierte un ítem de "problems"/"corrections" a texto legible, sea string u objeto. */
function stringifyIssue(item: unknown): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    const text = obj.description ?? obj.instruction ?? obj.message ?? obj.text ?? obj.reason ?? obj.problem;
    if (typeof text === "string") return text;
    return JSON.stringify(item);
  }
  return String(item);
}

function extractIssueList(value: unknown): string {
  if (Array.isArray(value)) return value.map(stringifyIssue).filter(Boolean).join("; ");
  if (typeof value === "string") return value;
  return "";
}

/** Intenta leer "approved"/"rejected" del texto del Inspector, sea JSON estricto o no. */
function parseInspectorVerdict(raw: string): { approved: boolean; problems: string } {
  try {
    const parsed = JSON.parse(raw);
    const approvalSignal = findApprovalSignal(parsed);
    const problems = extractIssueList((parsed as Record<string, unknown>)?.problems);
    const corrections = extractIssueList((parsed as Record<string, unknown>)?.corrections);
    return {
      approved: approvalSignal === true,
      problems: [problems, corrections].filter(Boolean).join(" | ") || "(sin detalle)",
    };
  } catch {
    const lower = raw.toLowerCase();
    return { approved: lower.includes("approved") && !lower.includes("rejected"), problems: raw.slice(0, 500) };
  }
}

export interface PipelineResult {
  imageUrl: string | null;
  approved: boolean;
  boxOutputs: Record<string, string | null>;
}

export async function runPromptBoxPipeline(params: {
  userId: string;
  articleTitle: string;
  articleSummary: string;
  ogImageUrl: string;
  format: Format;
  businessLogoUrl?: string | null;
  profilePhotoUrl?: string | null;
  pathPrefix: string;
}): Promise<PipelineResult> {
  const boxOutputs: Record<string, string | null> = {};
  if (!OPENAI_IMAGE_API_KEY) return { imageUrl: null, approved: false, boxOutputs };

  const target = FORMAT_TARGET[params.format];
  const boxes = await prisma.promptBox.findMany({ where: { isActive: true }, orderBy: { executionOrder: "asc" } });
  const bySlug = new Map(boxes.map((b) => [b.slug, b]));

  // Historial reciente para la Caja 2 (Director Creativo) — su propio
  // prompt tiene una sección "DIVERSIDAD CREATIVA" que pide explícitamente
  // revisar publicaciones recientes para no repetir el mismo modelo
  // conceptual/composición. Existía la tabla desde que se armó la
  // infraestructura pero nunca se leía ni se escribía. Auditoría 21/8/2026.
  const recentHistory = await prisma.creativeGenerationHistory.findMany({
    where: { userId: params.userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const historyText =
    recentHistory.length > 0
      ? recentHistory
          .map(
            (h, i) =>
              `${i + 1}. Modelo conceptual: ${h.conceptualModel || "?"} | Composición: ${h.composition || "?"} | Headline: "${h.headlineText || "?"}"`,
          )
          .join("\n")
      : "(sin historial reciente todavía)";

  const ogPng = await fetchImageAsPng(params.ogImageUrl);
  if (!ogPng) return { imageUrl: null, approved: false, boxOutputs };
  const ogBase64 = ogPng.toString("base64");

  const logoPng = params.businessLogoUrl ? await fetchImageAsPng(params.businessLogoUrl) : null;
  const usePhoto = Boolean(params.profilePhotoUrl) && Math.random() < 0.3;
  const photoPng = usePhoto && params.profilePhotoUrl ? await fetchImageAsPng(params.profilePhotoUrl) : null;
  const hasLogo = Boolean(logoPng);
  const logoBase64 = logoPng ? logoPng.toString("base64") : null;

  const baseContext =
    // target.label ya incluye la red social correcta ("Instagram Story",
    // "Facebook Story", etc.) — antes decía "Instagram" hardcodeado acá
    // ADEMÁS del label, contradiciéndolo para Facebook Story ("Instagram,
    // Facebook Story"). Auditoría 21/8/2026.
    `Red social y formato: ${target.label}.\n` +
    `Título del artículo: ${params.articleTitle}\n` +
    `Contenido/resumen del artículo: ${params.articleSummary}\n` +
    `¿Hay logo de marca disponible?: ${hasLogo ? "sí" : "no"}\n` +
    `Dimensiones finales: ${target.width}x${target.height}px.`;

  // CAJA 1 — Analista de Contenido
  const box1 = bySlug.get("content-analyst");
  if (box1) {
    boxOutputs["content-analyst"] = await runTextBox(box1, baseContext);
  }

  // CAJA 2 — Director Creativo (su propio prompt pide imagen OG Y logo del
  // usuario — antes solo veía la OG — y también pide historial reciente
  // para variar el modelo conceptual, antes nunca se le mandaba).
  // Auditoría 21/8/2026.
  const box2 = bySlug.get("creative-director");
  if (box2) {
    boxOutputs["creative-director"] = await runTextBox(
      box2,
      `${baseContext}\n\nSalida de la Caja 1 (Analista de Contenido):\n${boxOutputs["content-analyst"] || "(no disponible)"}\n\nHistorial reciente de publicaciones de este usuario (para evitar repetir el mismo modelo conceptual/composición):\n${historyText}\n\nSe adjuntan ${logoBase64 ? "2 imágenes: 1) la imagen OG del artículo; 2) el logo original del usuario" : "1 imagen: la imagen OG del artículo"}.`,
      [ogBase64, logoBase64],
    );
  }

  // CAJA 3 — Diseñador de Composición (su propio prompt pide explícitamente
  // "la imagen OG suministrada" y "el logo original del usuario" — antes
  // solo recibía texto, decidiendo dónde va cada cosa sin ver la foto
  // real. Auditoría 21/8/2026.
  const box3 = bySlug.get("composition-designer");
  if (box3) {
    boxOutputs["composition-designer"] = await runTextBox(
      box3,
      `${baseContext}\n\nSalida de la Caja 1:\n${boxOutputs["content-analyst"] || "(no disponible)"}\n\nSalida de la Caja 2 (Director Creativo):\n${boxOutputs["creative-director"] || "(no disponible)"}\n\nSe adjuntan ${logoBase64 ? "2 imágenes: 1) la imagen OG del artículo; 2) el logo original del usuario" : "1 imagen: la imagen OG del artículo"}.`,
      [ogBase64, logoBase64],
    );
  }

  // CAJA 4 — Editor de Texto Visual
  const box4 = bySlug.get("visual-text-editor");
  if (box4) {
    boxOutputs["visual-text-editor"] = await runTextBox(
      box4,
      `${baseContext}\n\nSalida de la Caja 1 (alternativas de texto):\n${boxOutputs["content-analyst"] || "(no disponible)"}\n\nSalida de la Caja 2 (concepto):\n${boxOutputs["creative-director"] || "(no disponible)"}\n\nSalida de la Caja 3 (composición):\n${boxOutputs["composition-designer"] || "(no disponible)"}`,
    );
  }

  // CAJA 5 — Constructor del Prompt Visual (su propio prompt lista, entre
  // sus "RECURSOS VISUALES", tanto la imagen OG como el logo original —
  // antes solo veía la OG). Auditoría 21/8/2026.
  const box5 = bySlug.get("visual-prompt-builder");
  let visualPrompt: string | null = null;
  if (box5) {
    visualPrompt = await runTextBox(
      box5,
      `${baseContext}\n\nSalida de la Caja 1:\n${boxOutputs["content-analyst"] || "(no disponible)"}\n\nSalida de la Caja 2:\n${boxOutputs["creative-director"] || "(no disponible)"}\n\nSalida de la Caja 3:\n${boxOutputs["composition-designer"] || "(no disponible)"}\n\nSalida de la Caja 4 (texto exacto):\n${boxOutputs["visual-text-editor"] || "(no disponible)"}\n\nSe adjuntan ${logoBase64 ? "2 imágenes: 1) la imagen OG del artículo, tu recurso principal; 2) el logo original del usuario" : "1 imagen: la imagen OG del artículo, tu recurso principal"}.`,
      [ogBase64, logoBase64],
    );
    boxOutputs["visual-prompt-builder"] = visualPrompt;
  }
  if (!visualPrompt) return { imageUrl: null, approved: false, boxOutputs };

  // Límite medible de headline que las Cajas 5/7/8 acordaron usar como
  // "fuente de verdad" compartida (rediseño de Milton 22/8/2026, en vez de
  // instrucciones cualitativas tipo "headline pequeño/mediano" que
  // generaban un loop de rechazos sin converger). Arranca con el valor que
  // decidió la Caja 5 y se actualiza con el de la Caja 8 después de cada
  // corrección — así la Caja 7 siempre evalúa contra el límite REAL usado
  // para generar la imagen que está inspeccionando, no contra un supuesto.
  let headlineHeightPercent: number | null = null;
  let headlineWidthPercent: number | null = null;
  try {
    const box5Parsed = JSON.parse(visualPrompt);
    headlineHeightPercent = findNumberByPattern(box5Parsed, /^headline_max_canvas_height_percent$/i);
    headlineWidthPercent = findNumberByPattern(box5Parsed, /^headline_max_canvas_width_percent$/i);
  } catch {
    // visualPrompt no llegó como JSON válido esta vez — Caja 7 usará su
    // propia escalera estándar (12/9/7.5%) según el número de intento.
  }

  // CAJA 6 — Generador de Imagen (no razona, solo ejecuta) + CAJA 7 — Inspector
  // + CAJA 8 — Corrector, con reintento hasta MAX_RETRIES.
  const box6 = bySlug.get("image-generator");
  const box7 = bySlug.get("quality-inspector");
  const box8 = bySlug.get("auto-corrector");

  // La foto de perfil (cuando se decide usarla) solo llega a OpenAI vía
  // refImages — Ideogram Remix en fal.ai solo acepta UNA imagen de
  // referencia (image_url), así que con IMAGE_PROVIDER="fal" esta foto se
  // ignora. Tampoco se le informa a las Cajas 1-5 que existe esta opción
  // (a diferencia del generador viejo). Caso de baja probabilidad (30%,
  // solo con usuarios que tienen foto de perfil configurada) — no es la
  // causa de los fallos vistos hasta ahora, queda documentado.
  const refImages = [ogPng, photoPng].filter((b): b is Buffer => b !== null);
  // Restricción técnica no negociable (no de estilo): un logo real se
  // compone de forma determinística DESPUÉS con sharp — si el modelo dibuja
  // su propio logo/insignia en esa misma zona, quedan dos logos superpuestos.
  // Esto no depende del prompt de Milton; depende de que el compositing
  // ocurre en código, así que la restricción va aparte, igual que en
  // aiImageGenerator.ts.
  const logoConstraint = hasLogo
    ? " Leave a clean, empty, uncluttered rectangular area in the bottom-right corner (roughly the bottom-right 30% width x 10% height of the frame) with nothing important there — no text, no busy detail, no headline text overlapping it. A real logo will be placed there afterward by separate exact compositing, so do not draw, sketch or invent any logo or brand text yourself in that corner."
    : "";
  let currentPrompt = extractVisualPrompt(visualPrompt, "Caja 5") + logoConstraint;
  let imageUrl: string | null = null;
  let approved = false;

  // Costo estimado por intento de generación de imagen (pedido de Milton:
  // poder ver cuánto se va gastando). Es un estimado fijo según el nivel
  // configurado, no un número real devuelto por la API — fal.ai no
  // devuelve el costo exacto en la respuesta.
  const IMAGE_COST_PER_ATTEMPT = IMAGE_PROVIDER === "fal" ? 0.03 : IMAGE_PROVIDER === "gpt-image-2" || IMAGE_PROVIDER === "gpt2" ? 0.054 : 0.015;
  let estimatedImageSpend = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const genStart = Date.now();
    let generatedImageUrl: string | null = null;
    console.log(`[PromptBoxPipeline] intento ${attempt}/${MAX_RETRIES} — prompt final (${currentPrompt.length} chars): ${currentPrompt.slice(0, 1500)}`);
    const modelLabel =
      IMAGE_PROVIDER === "fal"
        ? "fal-ai/ideogram-v3-remix"
        : IMAGE_PROVIDER === "gpt-image-2" || IMAGE_PROVIDER === "gpt2"
          ? "openai/gpt-image-2/edit"
          : "gpt-image-1-mini";
    try {
      const raw =
        IMAGE_PROVIDER === "fal"
          ? await generateImageBufferFal(currentPrompt, params.ogImageUrl, target.width, target.height)
          : IMAGE_PROVIDER === "gpt-image-2" || IMAGE_PROVIDER === "gpt2"
            ? await generateImageBufferGptImage2(currentPrompt, params.ogImageUrl, target.width, target.height, params.businessLogoUrl)
          : await generateImageBufferOpenAI(currentPrompt, refImages);
      estimatedImageSpend += IMAGE_COST_PER_ATTEMPT;
      // Ojo: esto es SOLO el costo de la Caja 6 (generación de imagen) — no
      // incluye el costo de las llamadas de texto/visión de las Cajas
      // 1-5,7,8 en gpt-4o-mini, que también consumen dinero real y no se
      // miden acá. El costo total real del pipeline es mayor a este número.
      console.log(`[PromptBoxPipeline] gasto estimado SOLO en generación de imagen (Caja 6, no incluye Cajas de texto/visión) hasta ahora: ~$${estimatedImageSpend.toFixed(3)} (${modelLabel})`);
      if (raw) {
        const resized = await sharp(raw).resize(target.width, target.height, { fit: "cover", position: "attention" }).toBuffer();
        const withLogo = logoPng ? await compositeLogo(resized, target.width, target.height, logoPng) : resized;
        const finalBuffer = await sharp(withLogo).jpeg({ quality: 90 }).toBuffer();
        const blob = await put(`${params.pathPrefix}/${Date.now()}-attempt${attempt}.jpg`, finalBuffer, {
          access: "public",
          contentType: "image/jpeg",
          addRandomSuffix: false,
        });
        const checkRes = await fetch(blob.url, { method: "HEAD" });
        if (checkRes.ok) generatedImageUrl = blob.url;
      }
      if (box6) {
        await recordExecution(box6.id, currentPrompt, generatedImageUrl, modelLabel, genStart, generatedImageUrl ? null : "No se generó imagen");
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[PromptBoxPipeline] intento ${attempt}/${MAX_RETRIES} — error del proveedor (${modelLabel}): ${errMsg}`);
      if (box6) await recordExecution(box6.id, currentPrompt, null, modelLabel, genStart, errMsg);
    }

    if (!generatedImageUrl) break; // sin imagen, no hay nada que inspeccionar
    imageUrl = generatedImageUrl;
    boxOutputs["image-generator"] = generatedImageUrl;

    if (!box7) {
      approved = true; // sin Inspector activo, se acepta el resultado tal cual
      break;
    }

    // El propio prompt de la Caja 7 (Inspector) pide explícitamente poder
    // comparar contra la imagen OG original, el logo real, y los
    // resultados de las Cajas 2/3/5 (modelo conceptual, composición
    // esperada, márgenes) — antes solo recibía la imagen generada y el
    // texto de la Caja 4, así que estaba juzgando sin las referencias que
    // su propio prompt asume que va a tener. Auditoría 21/8/2026.
    //
    // Rediseño de Milton 22/8/2026: la Caja 7 ahora exige explícitamente
    // el número de intento y el límite medible de headline REALMENTE usado
    // para generar esta imagen (de la Caja 5 en el intento original, o de
    // la corrección de la Caja 8 en reintentos) — sin esto no tiene con
    // qué comparar y cae de vuelta en juicios cualitativos.
    const generatedBase64 = (await fetchImageAsPng(generatedImageUrl))?.toString("base64") ?? null;
    const inspectorImages = [ogBase64, logoBase64, generatedBase64].filter(
      (img): img is string => Boolean(img),
    );
    const headlineLimitText =
      headlineHeightPercent != null
        ? `headline_max_canvas_height_percent=${headlineHeightPercent}, headline_max_canvas_width_percent=${headlineWidthPercent ?? "(no especificado)"}.`
        : "no se pudo extraer un valor numérico explícito esta vez — usa la escalera estándar del sistema según el número de intento (12% / 9% / 7.5%).";
    const inspectorRaw = await runTextBox(
      box7,
      `${baseContext}\n\nNúmero de intento actual (1=generación original, 2=primer reintento, 3=segundo reintento): ${attempt + 1}.\n\nLímite de headline REALMENTE usado para generar esta imagen (fuente de verdad): ${headlineLimitText}\n\nSalida de la Caja 2 (Director Creativo — modelo conceptual y dirección):\n${boxOutputs["creative-director"] || "(no disponible)"}\n\nSalida de la Caja 3 (Diseñador de Composición — composición, márgenes y áreas esperadas):\n${boxOutputs["composition-designer"] || "(no disponible)"}\n\nSalida de la Caja 5 (Constructor del Prompt Visual — LOCKED_COPY, concepto, composición y typography_constraints):\n${boxOutputs["visual-prompt-builder"] || "(no disponible)"}${attempt > 0 ? `\n\nCorrección aplicada por la Caja 8 que generó esta imagen (contiene el nuevo límite usado):\n${boxOutputs["auto-corrector"] || "(no disponible)"}` : ""}\n\nMensaje/texto que debía llevar la imagen, LOCKED_COPY (según Caja 4):\n${boxOutputs["visual-text-editor"] || "(no disponible)"}\n\n¿Hay logo esperado?: ${hasLogo ? "sí" : "no"}\n\nSe adjuntan ${inspectorImages.length} imágenes en este orden: 1) la imagen OG original del artículo (para comparar fidelidad); ${logoBase64 ? "2) el archivo original del logo del usuario (para comparar identidad y proporciones); 3) " : "2) "}la imagen final generada, la que debes inspeccionar.`,
      inspectorImages,
    );
    boxOutputs["quality-inspector"] = inspectorRaw;
    if (!inspectorRaw) break;

    const verdict = parseInspectorVerdict(inspectorRaw);
    console.log(`[PromptBoxPipeline] intento ${attempt}/${MAX_RETRIES} — inspector aprobado=${verdict.approved} problemas: ${verdict.problems.slice(0, 500)}`);
    if (verdict.approved) {
      approved = true;
      break;
    }

    if (attempt >= MAX_RETRIES || !box8) break;

    // El propio prompt de la Caja 8 (Corrector) espera ver la imagen
    // generada que se está corrigiendo y el número de intento actual —
    // antes no recibía ninguna imagen, solo la descripción textual del
    // Inspector. Auditoría 21/8/2026.
    //
    // Rediseño de Milton 22/8/2026: la Caja 8 ahora exige explícitamente la
    // salida completa de la Caja 5 (LOCKED_COPY, concepto, composición,
    // typography_constraints) y el JSON completo de la Caja 7 (incluido
    // `headline_measurement` con el límite configurado real) — antes solo
    // recibía el texto de "problemas" ya resumido por mi código, perdiendo
    // el valor numérico exacto que necesita para calcular el siguiente
    // target absoluto (12% → 9% → 7.5%).
    const correctedPrompt = await runTextBox(
      box8,
      `Intento actual: ${attempt + 1} de ${MAX_RETRIES + 1} (MAX_RETRIES=${MAX_RETRIES}).\n\nModelo/proveedor usado para generar la imagen rechazada: ${modelLabel}.\n\nPrompt anterior usado para generar la imagen:\n${currentPrompt}\n\nSalida completa de la Caja 5 (Constructor del Prompt Visual — LOCKED_COPY, concepto, composición, typography_constraints):\n${boxOutputs["visual-prompt-builder"] || "(no disponible)"}\n\nSalida completa de la Caja 7 (Inspector de Calidad, JSON con quality_inspection, headline_measurement, scores, problems, corrections, preserve, next_action):\n${inspectorRaw}\n\nSe adjunta la imagen generada que fue rechazada, para que la veas antes de corregir.\n\nConstruye un nuevo prompt corregido, cambiando solo lo necesario para resolver esos problemas.`,
      [generatedBase64],
    );
    boxOutputs["auto-corrector"] = correctedPrompt;
    if (!correctedPrompt) break;
    // Actualiza el límite medible de headline con el nuevo target que haya
    // decidido la Caja 8, para que la Caja 7 lo reciba como "fuente de
    // verdad" en el siguiente intento. Si la Caja 8 no corrigió headline
    // (`required: false` o el campo no viene), se conserva el valor anterior.
    try {
      const box8Parsed = JSON.parse(correctedPrompt);
      const newHeight = findNumberByPattern(box8Parsed, /^new_target_max_canvas_height_percent$/i);
      const newWidth = findNumberByPattern(box8Parsed, /^headline_max_canvas_width_percent$/i);
      if (newHeight != null) headlineHeightPercent = newHeight;
      if (newWidth != null) headlineWidthPercent = newWidth;
    } catch {
      // No era JSON válido esta vez — se conserva el límite anterior;
      // extractVisualPrompt ya tiene su propio respaldo por regex para
      // rescatar el texto del prompt en sí.
    }
    // La restricción del logo se reaplica siempre: el Corrector no tiene por
    // qué preservarla palabra por palabra en su reescritura.
    currentPrompt = extractVisualPrompt(correctedPrompt, `Caja 8 (intento ${attempt})`) + logoConstraint;
  }

  // Registrar la decisión creativa aprobada para que futuras corridas de
  // este usuario (vía la Caja 2, arriba) puedan evitar repetir el mismo
  // modelo conceptual/composición. Solo se registra si se aprobó de
  // verdad — no tiene sentido "aprender" de intentos rechazados.
  if (approved) {
    try {
      const box2Parsed = boxOutputs["creative-director"] ? JSON.parse(boxOutputs["creative-director"]) : null;
      const box3Parsed = boxOutputs["composition-designer"] ? JSON.parse(boxOutputs["composition-designer"]) : null;
      const box4Parsed = boxOutputs["visual-text-editor"] ? JSON.parse(boxOutputs["visual-text-editor"]) : null;
      await prisma.creativeGenerationHistory.create({
        data: {
          userId: params.userId,
          conceptualModel: box2Parsed ? findFieldByPattern(box2Parsed, /^conceptual_model$/i) : null,
          composition: box3Parsed ? findFieldByPattern(box3Parsed, /^layout$/i) : null,
          headlineText: box4Parsed ? findFieldByPattern(box4Parsed, /^headline$/i) : null,
          textPosition: box3Parsed ? findFieldByPattern(box3Parsed, /^text_safe_area$/i) : null,
          logoPosition: box3Parsed ? findFieldByPattern(box3Parsed, /^logo_safe_area$/i) : null,
          publicationType: params.format === "facebook-story" ? "facebook-story" : `instagram-${params.format}`,
        },
      });
    } catch (err) {
      console.warn("[PromptBoxPipeline] no se pudo guardar CreativeGenerationHistory:", err);
    }
  }

  return { imageUrl, approved, boxOutputs };
}
