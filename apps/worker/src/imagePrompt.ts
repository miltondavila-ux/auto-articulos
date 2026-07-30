// Escribe el prompt de la imagen del artículo con IA (a partir del título y
// resumen reales) y valida con visión si la imagen resultante corresponde al
// tema, para poder pedir una nueva si no corresponde. Usa OpenAI (gpt-4o-mini)
// porque el costo por artículo es prácticamente nulo (fracciones de centavo).
// Si no hay OPENAI_API_KEY configurada, o si la API falla, no se bloquea el
// artículo: se usa un prompt de respaldo y se acepta la imagen sin validar.

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const IMAGE_PROMPT_MAX_LEN = 590; // #images tiene maxlength=600 en la plataforma

export async function buildImagePrompt(
  title: string,
  summary: string,
): Promise<string> {
  if (!OPENAI_API_KEY) return fallbackPrompt(title, summary);

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
            content:
              `Escribe, en inglés, un prompt de máximo 500 caracteres para generar una ` +
              `imagen fotorrealista (nunca ilustración, dibujo ni render 3D) que represente ` +
              `visualmente el tema de este artículo, sin ningún texto, letra, número, logotipo ` +
              `ni marca de agua visible en la imagen.\n\n` +
              `Título: "${title}"\nResumen: "${summary}"\n\n` +
              `Responde ÚNICAMENTE con el prompt final, sin comillas ni explicación.`,
          },
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
    });
    if (!res.ok) return fallbackPrompt(title, summary);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text
      ? text.slice(0, IMAGE_PROMPT_MAX_LEN)
      : fallbackPrompt(title, summary);
  } catch {
    return fallbackPrompt(title, summary);
  }
}

function fallbackPrompt(title: string, summary: string): string {
  const prompt =
    `Photorealistic professional photograph clearly related to: "${title}". ` +
    `Context: ${summary}. Real camera photo, natural lighting, no illustration, ` +
    `no 3D render, no text, no letters, no logos, no watermarks.`;
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
