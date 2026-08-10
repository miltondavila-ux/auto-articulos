import { buildImagePrompt } from "./image-prompt";

const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";

export interface GeneratedImageResult {
  url?: string;
  b64?: string;
}

/**
 * Genera una imagen con IA para una publicación social (Threads/X/LinkedIn).
 * Prueba gpt-image-1 y cae a dall-e-3 si el primero falla. Registra el
 * motivo real de cualquier error de OpenAI (antes fallaba en silencio).
 * No sube nada a almacenamiento — eso lo hace el llamador con su propia
 * integración de Vercel Blob, según si necesita una URL persistente o no.
 */
export async function generateSocialImageRaw(
  summary: string,
  customImagePrompt?: string | null,
  extraStyle?: string
): Promise<GeneratedImageResult | null> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return null;

  const basePrompt = buildImagePrompt(summary, customImagePrompt);
  const prompt = extraStyle ? `${basePrompt}\n\n${extraStyle}` : basePrompt;
  const models = ["gpt-image-1", "dall-e-3"];

  for (const model of models) {
    try {
      const response = await fetch(OPENAI_IMAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model, prompt, size: "1024x1024", n: 1 }),
      });

      const data = (await response.json()) as {
        data?: { url?: string; b64_json?: string }[];
        error?: { message?: string };
      };

      if (!response.ok || data.error) {
        console.warn(
          `OpenAI rechazó la generación de imagen con modelo ${model} (status ${response.status}):`,
          data.error?.message || JSON.stringify(data),
        );
        continue;
      }

      const url = data.data?.[0]?.url;
      const b64 = data.data?.[0]?.b64_json;

      if (url) return { url };
      if (b64) return { b64 };

      console.warn(`Modelo ${model} respondió OK pero sin url ni b64_json:`, JSON.stringify(data));
    } catch (err) {
      console.warn(`Fallo al generar imagen social con modelo ${model}:`, err);
    }
  }

  return null;
}
