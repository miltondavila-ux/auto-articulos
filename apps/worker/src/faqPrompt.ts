// Genera preguntas frecuentes (FAQ) reales a partir del contenido real del
// artículo, usando OpenAI (gpt-4o-mini, costo prácticamente nulo por
// artículo). Pedido explícito del usuario (31/7/2026): antes las preguntas
// eran una plantilla fija de relleno ("¿Qué opciones tengo disponibles?",
// "¿Cómo puedo tomar la mejor decisión?"...) que no tenía nada que ver con
// el tema real. Ahora deben ser las preguntas que la gente REALMENTE busca
// sobre ESE artículo puntual, con respuestas basadas solo en su contenido.
//
// Si no hay OPENAI_API_KEY, la llamada falla, o el modelo no devuelve nada
// utilizable, se devuelve un array vacío — el llamador debe omitir el FAQ en
// ese caso en vez de mostrar preguntas genéricas que no sirven.

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MAX_CONTENT_CHARS = 6000; // contexto suficiente sin gastar tokens de más

export interface Faq {
  q: string;
  a: string;
}

export async function generateFaqs(
  title: string,
  summary: string,
  plainContent: string,
): Promise<Faq[]> {
  if (!OPENAI_API_KEY) return [];

  const prompt = [
    "Sos un experto en SEO para artículos de bienes raíces y seguros de salud.",
    `Te doy el título y el contenido real de un artículo: "${title}".`,
    "Generá entre 4 y 6 preguntas frecuentes (FAQ) que una persona REALMENTE " +
      "escribiría en Google sobre este tema puntual, o se haría al terminar " +
      "de leer este artículo. NO generes preguntas genéricas que podrían " +
      "servir para cualquier artículo del mismo rubro (por ejemplo, evitá " +
      "cosas como \"¿qué opciones tengo?\" o \"¿a quién contacto?\" si no " +
      "surgen naturalmente del contenido).",
    "Cada respuesta debe basarse ÚNICAMENTE en la información del resumen y " +
      "el contenido de abajo — no inventes datos, cifras, nombres ni " +
      "afirmaciones que no estén ahí. Si el artículo no da suficiente " +
      "información para responder algo con precisión, no incluyas esa " +
      "pregunta.",
    "Respondé ÚNICAMENTE con un array JSON de objetos con las claves \"q\" " +
      "y \"a\" (strings), sin texto adicional antes ni después, sin markdown " +
      "ni bloques de código.",
    "",
    `Resumen: ${summary}`,
    "",
    `Contenido: ${plainContent.slice(0, MAX_CONTENT_CHARS)}`,
  ].join("\n");

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 900,
      }),
    });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = (data.choices?.[0]?.message?.content ?? "").trim();
    const jsonText = extractJsonArray(raw);
    if (!jsonText) return [];

    const parsed: unknown = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item): item is Faq =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Faq).q === "string" &&
          typeof (item as Faq).a === "string" &&
          (item as Faq).q.trim().length > 0 &&
          (item as Faq).a.trim().length > 0,
      )
      .slice(0, 6);
  } catch {
    return [];
  }
}

// El modelo a veces envuelve el JSON en ```json ... ``` pese a la
// instrucción de no hacerlo — esto lo extrae de forma tolerante.
function extractJsonArray(text: string): string | null {
  const match = text.match(/\[[\s\S]*\]/);
  return match ? match[0] : null;
}
