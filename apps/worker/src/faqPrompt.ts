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
): Promise<Faq[]> {
  if (!OPENAI_API_KEY) return [];

  const prompt = [
    "Sos un experto en SEO y en AEO (Answer Engine Optimization: redactar " +
      "para que un buscador o una IA como ChatGPT, Perplexity o Google AI " +
      "Overview pueda citar tu respuesta directamente como LA respuesta) " +
      "para artículos en español dirigidos a un público hispanohablante en " +
      "Estados Unidos (el mercado principal de esta plataforma es Florida), " +
      "sobre bienes raíces y seguros de salud/vida/incapacidad.",
    `Te doy el título y el contenido real de un artículo: "${title}".`,
    "Generá entre 4 y 6 preguntas frecuentes (FAQ). Usá patrones de alta " +
      "intención de búsqueda que la gente realmente escribe en Google o le " +
      "pregunta a una IA — por ejemplo (adaptalos SIEMPRE al tema concreto " +
      'del artículo, nunca los dejes genéricos): "¿Qué debo saber sobre ' +
      '[tema concreto del artículo] en Florida y en Estados Unidos?", "¿Qué ' +
      "opciones tengo disponibles respecto a [tema concreto]?\", \"¿Cómo " +
      'puedo tomar la mejor decisión en mi caso respecto a [tema concreto]?"' +
      ", además de 1-3 preguntas más específicas que surjan directamente " +
      "del contenido particular de este artículo (comparaciones, " +
      "diferencias, requisitos, etc. si el artículo las trata).",
    "Incluí el contexto geográfico (Estados Unidos, y Florida cuando " +
      "corresponda) en al menos la primera pregunta y donde ayude a que la " +
      "pregunta suene a una búsqueda real localizada — pero no lo repitas " +
      "de forma forzada en todas.",
    "Las respuestas son la parte más importante: escribilas vos mismo, bien " +
      "redactadas, completas (3 a 5 oraciones), respondiendo la pregunta de " +
      "forma directa y clara desde la primera oración (para que un motor de " +
      "búsqueda o una IA la pueda citar tal cual), y agregando después el " +
      "contexto relevante del artículo. NO cortes ni copies oraciones " +
      "textuales del contenido — redactá la respuesta de nuevo, con tu " +
      "propio criterio experto, aunque basada estrictamente en los hechos " +
      "del resumen y el contenido de abajo. No inventes datos, cifras, " +
      "nombres, leyes ni afirmaciones que no estén respaldadas por ese " +
      "contenido. Si el artículo no da suficiente información para responder " +
      "algo con precisión, no incluyas esa pregunta.",
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
