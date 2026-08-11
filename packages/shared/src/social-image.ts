import { buildImagePrompt } from "./image-prompt";

const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";
const OPENAI_IMAGE_EDITS_URL = "https://api.openai.com/v1/images/edits";

export interface GeneratedImageResult {
  url?: string;
  b64?: string;
}

async function downloadImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/png";
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return { base64, mimeType: contentType };
  } catch {
    return null;
  }
}

/**
 * Genera una imagen con IA para una publicación social (Threads/X/LinkedIn).
 * Prueba gpt-image-1 y cae a dall-e-3 si el primero falla. Si se pasa logoUrl,
 * usa gpt-image-1 image-edits para incorporar el logo en la imagen. Registra el
 * motivo real de cualquier error de OpenAI. No sube nada a almacenamiento — eso
 * lo hace el llamador con su propia integración de Vercel Blob.
 */
export async function generateSocialImageRaw(
  summary: string,
  customImagePrompt?: string | null,
  extraStyle?: string,
  logoUrl?: string | null,
  platform?: string | null,
): Promise<GeneratedImageResult | null> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return null;

  const basePrompt = buildImagePrompt(summary, customImagePrompt);
  const prompt = extraStyle ? `${basePrompt}\n\n${extraStyle}` : basePrompt;

  const hasLogo = Boolean(logoUrl);

  // Tamaño según plataforma: LinkedIn prefiere landscape, los demás square
  const isLinkedIn = platform === "linkedin";
  const editSize = "1024x1024";
  const genSize = isLinkedIn ? "1792x1024" : "1024x1024";

  // Lista de intentos: primero con logo (image edits), luego fallback a texto solo.
  const attempts: Array<{ model: "gpt-image-1" | "dall-e-3"; useEdits: boolean }> = hasLogo
    ? [
        { model: "gpt-image-1", useEdits: true },
        { model: "gpt-image-1", useEdits: false },
        { model: "dall-e-3", useEdits: false },
      ]
    : [
        { model: "gpt-image-1", useEdits: false },
        { model: "dall-e-3", useEdits: false },
      ];

  for (const { model, useEdits } of attempts) {
    try {
      let response: Response;

      if (useEdits && hasLogo) {
        const logoData = await downloadImageAsBase64(logoUrl!);
        if (!logoData) {
          console.warn(`[social-image] No se pudo descargar el logo ${logoUrl}, fallback a texto`);
          continue;
        }

        const formData = new FormData();
        formData.append("model", "gpt-image-1");
        formData.append(
          "prompt",
          `${prompt}\n\nIncorpora el logo proporcionado de forma natural y profesional en la imagen, como una marca de agua o en una esquina.`,
        );
        formData.append("size", editSize);
        formData.append("n", "1");

        const blob = new Blob([Buffer.from(logoData.base64, "base64")], { type: logoData.mimeType });
        formData.append("image[]", blob, "logo");

        response = await fetch(OPENAI_IMAGE_EDITS_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: formData,
        });
      } else {
        const size = model === "dall-e-3" ? genSize : isLinkedIn ? "1536x1024" : "1024x1024";
        response = await fetch(OPENAI_IMAGE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: JSON.stringify({ model, prompt, size, n: 1 }),
        });
      }

      const data = (await response.json()) as {
        data?: { url?: string; b64_json?: string }[];
        error?: { message?: string };
      };

      if (!response.ok || data.error) {
        console.warn(
          `[social-image] OpenAI rechazó con modelo ${model} (status ${response.status}):`,
          data.error?.message || JSON.stringify(data),
        );
        continue;
      }

      const url = data.data?.[0]?.url;
      const b64 = data.data?.[0]?.b64_json;

      if (url) return { url };
      if (b64) return { b64 };

      console.warn(`[social-image] Modelo ${model} respondió OK pero sin url ni b64_json:`, JSON.stringify(data));
    } catch (err) {
      console.warn(`[social-image] Fallo con modelo ${model}:`, err);
    }
  }

  return null;
}
