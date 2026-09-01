import { describeContentLanguage } from "./automation/contentLanguage";

// Genera preguntas frecuentes (FAQ) reales a partir del contenido real del
// artículo, usando OpenAI (gpt-4o-mini, costo prácticamente nulo por
// artículo). Pedido explícito del usuario (31/7/2026, en dos vueltas):
//
// 1) El problema NO era el estilo de preguntas tipo "¿Qué debo saber sobre
//    X?", "¿Qué opciones tengo disponibles?", "¿Cómo puedo tomar la mejor
//    decisión en mi caso?" — esas son justamente patrones de alta intención
//    de búsqueda que SÍ conviene usar. El problema era que las RESPUESTAS se
//    armaban cortando oraciones del texto al bruto (basura), sin redactarlas
//    de verdad ni pensar en SEO/AEO (Answer Engine Optimization: que un
//    buscador o una IA como ChatGPT/Perplexity/Google AI Overview pueda
//    citar la respuesta directamente).
// 2) Las preguntas y respuestas deben incorporar el contexto geográfico
//    relevante (Estados Unidos, y el estado — normalmente Florida, mercado
//    principal de esta plataforma — cuando corresponda), porque así es como
//    la gente busca de verdad ("seguro de incapacidad en Florida", "seguro
//    médico en Estados Unidos"), en vez de preguntas genéricas sin ubicar.
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
  contentLanguage = "es",
): Promise<Faq[]> {
  if (!OPENAI_API_KEY) return [];

  const targetLanguage = describeContentLanguage(contentLanguage);
  const prompt = [
    "You are an expert SEO and AEO (Answer Engine Optimization) writer. " +
      `Write every question and answer entirely in ${targetLanguage}. ` +
      "Do not mix languages or copy the language of the source content. " +
      "Use the article's facts only; never invent data, names, laws, or claims.",
    `Article title: "${title}".`,
    "Generate 4 to 6 FAQs using high-intent search patterns adapted to the " +
      "specific topic, plus 1 to 3 specific questions grounded directly in " +
      "the article (comparisons, differences, requirements, or other details " +
      "when covered).",
    "Include the relevant geographic context (the United States and Florida " +
      "when appropriate) in at least the first question and wherever it makes " +
      "the query sound like a real localized search, without forcing it into " +
      "every question.",
    "The answers are most important: write them yourself as complete 3-to-5 " +
      "sentence answers that respond directly from the first sentence, so a " +
      "search engine or AI can cite them. Base them strictly on the summary " +
      "and content below. Do not copy sentences verbatim. If the article does " +
      "not contain enough information to answer precisely, omit that question.",
    `LANGUAGE RULE: The q and a values must be entirely in ${targetLanguage}. ` +
      "Only unavoidable proper names or official brand names may remain in " +
      "their original form.",
    "Respond ONLY with a JSON array of objects containing the string keys " +
      "q and a, with no text before or after it, no markdown, and no code fences.",
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
        temperature: 0.5,
        max_tokens: 1400,
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
