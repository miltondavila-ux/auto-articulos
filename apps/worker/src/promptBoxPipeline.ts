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

const MAX_RETRIES = 2;

type Format = "story" | "reel-image" | "post" | "facebook-story";

const FORMAT_TARGET: Record<Format, { editSize: "1024x1536"; width: number; height: number; label: string }> = {
  story: { editSize: "1024x1536", width: 1080, height: 1920, label: "Instagram Story" },
  "reel-image": { editSize: "1024x1536", width: 1080, height: 1920, label: "Instagram Reel cover" },
  post: { editSize: "1024x1536", width: 1080, height: 1350, label: "Instagram feed post" },
  "facebook-story": { editSize: "1024x1536", width: 1080, height: 1920, label: "Facebook Story" },
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
  imageBase64?: string,
): Promise<string | null> {
  if (!OPENAI_IMAGE_API_KEY) return null;
  const started = Date.now();
  const userContent: Array<Record<string, unknown>> = [{ type: "text", text: userText }];
  if (imageBase64) {
    userContent.push({ type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } });
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
        max_tokens: 1200,
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

/** Intenta leer "approved"/"rejected" del texto del Inspector, sea JSON estricto o no. */
function parseInspectorVerdict(raw: string): { approved: boolean; problems: string } {
  try {
    const parsed = JSON.parse(raw);
    const status = String(parsed.status || "").toLowerCase();
    const problems = Array.isArray(parsed.problems) ? parsed.problems.join("; ") : String(parsed.problems || "");
    const corrections = Array.isArray(parsed.corrections) ? parsed.corrections.join("; ") : String(parsed.corrections || "");
    return { approved: status.includes("approv"), problems: [problems, corrections].filter(Boolean).join(" | ") };
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

  const ogPng = await fetchImageAsPng(params.ogImageUrl);
  if (!ogPng) return { imageUrl: null, approved: false, boxOutputs };
  const ogBase64 = ogPng.toString("base64");

  const logoPng = params.businessLogoUrl ? await fetchImageAsPng(params.businessLogoUrl) : null;
  const usePhoto = Boolean(params.profilePhotoUrl) && Math.random() < 0.3;
  const photoPng = usePhoto && params.profilePhotoUrl ? await fetchImageAsPng(params.profilePhotoUrl) : null;
  const hasLogo = Boolean(logoPng);

  const baseContext =
    `Red social y formato: Instagram, ${target.label}.\n` +
    `Título del artículo: ${params.articleTitle}\n` +
    `Contenido/resumen del artículo: ${params.articleSummary}\n` +
    `¿Hay logo de marca disponible?: ${hasLogo ? "sí" : "no"}\n` +
    `Dimensiones finales: ${target.width}x${target.height}px.`;

  // CAJA 1 — Analista de Contenido
  const box1 = bySlug.get("content-analyst");
  if (box1) {
    boxOutputs["content-analyst"] = await runTextBox(box1, baseContext);
  }

  // CAJA 2 — Director Creativo (ve la imagen OG)
  const box2 = bySlug.get("creative-director");
  if (box2) {
    boxOutputs["creative-director"] = await runTextBox(
      box2,
      `${baseContext}\n\nSalida de la Caja 1 (Analista de Contenido):\n${boxOutputs["content-analyst"] || "(no disponible)"}\n\nAquí está la imagen OG del artículo.`,
      ogBase64,
    );
  }

  // CAJA 3 — Diseñador de Composición
  const box3 = bySlug.get("composition-designer");
  if (box3) {
    boxOutputs["composition-designer"] = await runTextBox(
      box3,
      `${baseContext}\n\nSalida de la Caja 1:\n${boxOutputs["content-analyst"] || "(no disponible)"}\n\nSalida de la Caja 2 (Director Creativo):\n${boxOutputs["creative-director"] || "(no disponible)"}`,
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

  // CAJA 5 — Constructor del Prompt Visual (ve la imagen OG otra vez)
  const box5 = bySlug.get("visual-prompt-builder");
  let visualPrompt: string | null = null;
  if (box5) {
    visualPrompt = await runTextBox(
      box5,
      `${baseContext}\n\nSalida de la Caja 1:\n${boxOutputs["content-analyst"] || "(no disponible)"}\n\nSalida de la Caja 2:\n${boxOutputs["creative-director"] || "(no disponible)"}\n\nSalida de la Caja 3:\n${boxOutputs["composition-designer"] || "(no disponible)"}\n\nSalida de la Caja 4 (texto exacto):\n${boxOutputs["visual-text-editor"] || "(no disponible)"}\n\nAquí está la imagen OG del artículo, tu recurso principal.`,
      ogBase64,
    );
    boxOutputs["visual-prompt-builder"] = visualPrompt;
  }
  if (!visualPrompt) return { imageUrl: null, approved: false, boxOutputs };

  // CAJA 6 — Generador de Imagen (no razona, solo ejecuta) + CAJA 7 — Inspector
  // + CAJA 8 — Corrector, con reintento hasta MAX_RETRIES.
  const box6 = bySlug.get("image-generator");
  const box7 = bySlug.get("quality-inspector");
  const box8 = bySlug.get("auto-corrector");

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
  let currentPrompt = visualPrompt + logoConstraint;
  let imageUrl: string | null = null;
  let approved = false;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const genStart = Date.now();
    let generatedImageUrl: string | null = null;
    try {
      const form = new FormData();
      form.append("model", "gpt-image-1-mini");
      form.append("prompt", currentPrompt.slice(0, 4000));
      form.append("size", target.editSize);
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
      if (res.ok) {
        const data = (await res.json()) as { data?: { b64_json?: string }[] };
        const b64 = data.data?.[0]?.b64_json;
        if (b64) {
          const raw = Buffer.from(b64, "base64");
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
      }
      if (box6) {
        await recordExecution(box6.id, currentPrompt, generatedImageUrl, "gpt-image-1-mini", genStart, generatedImageUrl ? null : "No se generó imagen");
      }
    } catch (err) {
      if (box6) await recordExecution(box6.id, currentPrompt, null, "gpt-image-1-mini", genStart, err instanceof Error ? err.message : String(err));
    }

    if (!generatedImageUrl) break; // sin imagen, no hay nada que inspeccionar
    imageUrl = generatedImageUrl;
    boxOutputs["image-generator"] = generatedImageUrl;

    if (!box7) {
      approved = true; // sin Inspector activo, se acepta el resultado tal cual
      break;
    }

    const inspectorRaw = await runTextBox(
      box7,
      `${baseContext}\n\nMensaje/texto que debía llevar la imagen (según Caja 4):\n${boxOutputs["visual-text-editor"] || "(no disponible)"}\n\n¿Hay logo esperado?: ${hasLogo ? "sí" : "no"}\n\nAquí está la imagen generada para inspeccionar.`,
      (await fetchImageAsPng(generatedImageUrl))?.toString("base64"),
    );
    boxOutputs["quality-inspector"] = inspectorRaw;
    if (!inspectorRaw) break;

    const verdict = parseInspectorVerdict(inspectorRaw);
    if (verdict.approved) {
      approved = true;
      break;
    }

    if (attempt >= MAX_RETRIES || !box8) break;

    const correctedPrompt = await runTextBox(
      box8,
      `Prompt anterior usado para generar la imagen:\n${currentPrompt}\n\nProblemas encontrados por el Inspector de Calidad:\n${verdict.problems}\n\nConstruye un nuevo prompt corregido, cambiando solo lo necesario para resolver esos problemas.`,
    );
    boxOutputs["auto-corrector"] = correctedPrompt;
    if (!correctedPrompt) break;
    // La restricción del logo se reaplica siempre: el Corrector no tiene por
    // qué preservarla palabra por palabra en su reescritura.
    currentPrompt = correctedPrompt + logoConstraint;
  }

  return { imageUrl, approved, boxOutputs };
}
