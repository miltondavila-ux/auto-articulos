// Arma el prompt de la imagen del artículo con una plantilla fija (pedida
// explícitamente por el usuario el 30/7/2026, usando el Resumen real del
// artículo) y valida con visión si la imagen resultante corresponde al
// tema, para poder pedir una nueva si no corresponde. La validación usa
// OpenAI (gpt-4o-mini) porque el costo por artículo es prácticamente nulo
// (fracciones de centavo). Si no hay OPENAI_API_KEY configurada, o si la
// API falla, no se bloquea el artículo: se acepta la imagen sin validar.

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const IMAGE_PROMPT_MAX_LEN = 590; // #images tiene maxlength=600 en la plataforma

export function buildImagePrompt(summary: string): string {
  const prompt = `Crea una imagen hiperrealista donde haya humanos y tomando en cuenta este texto: ${summary}`;
  return prompt.slice(0, IMAGE_PROMPT_MAX_LEN);
}

/**
 * Le pregunta a un modelo con visión si la imagen corresponde al tema. Si la
 * llamada falla por cualquier motivo (sin API key, error de red, etc.), se
 * acepta la imagen sin bloquear el artículo — la validación es un plus, no
 * un requisito para publicar.
 */
export async function isImageRelevant(
  imageBase64: string,
  title: string,
  summary: string,
): Promise<boolean> {
  if (!OPENAI_API_KEY) return true;

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `¿Esta imagen tiene relación clara y directa con este tema: "${title}" ` +
                  `(${summary})? No seas muy exigente: basta con que la escena, las personas ` +
                  `o los objetos mostrados se relacionen razonablemente con el tema. ` +
                  `Responde ÚNICAMENTE "SI" o "NO".`,
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        max_tokens: 5,
      }),
    });
    if (!res.ok) return true;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const answer = (data.choices?.[0]?.message?.content ?? "")
      .trim()
      .toUpperCase();
    return answer.startsWith("S") || answer.startsWith("Y");
  } catch {
    return true;
  }
}
