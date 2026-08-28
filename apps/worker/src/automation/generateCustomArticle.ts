const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

interface CustomArticleResult {
  title: string;
  summary: string;
  contentHtml: string;
}

export async function generateCustomArticle(
  titleText: string,
  promptTemplate: string,
  contentLanguage: string
): Promise<CustomArticleResult> {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "La clave de API de OpenAI (OPENAI_API_KEY) no está configurada en las variables de entorno."
    );
  }

  // Reemplazar placeholders en el prompt del usuario
  const userPrompt = promptTemplate
    .replace(/{title}/gi, titleText)
    .replace(/{keyword}/gi, titleText);

  const systemPrompt = `Eres un redactor experto en SEO y marketing digital.
Tu tarea es escribir un artículo de blog completo de alta calidad en el idioma "${contentLanguage}", siguiendo de manera estricta las instrucciones dadas por el usuario.

Debes responder ÚNICAMENTE en formato JSON con la siguiente estructura exacta:
{
  "title": "El título final u optimizado para el artículo (máximo 200 caracteres)",
  "summary": "Un resumen/extracto corto y atractivo para SEO, de 150 a 280 caracteres",
  "contentHtml": "El cuerpo del artículo redactado en formato HTML limpio. Utiliza etiquetas semánticas como <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>. NO incluyas etiquetas estructurales de documento completo como <html>, <head>, <body>, <!DOCTYPE>, ni bloques de código markdown como \`\`\`html."
}

Asegúrate de que el HTML generado sea válido y esté limpio.`;

  const response = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // Modelo económico, rápido y de alto rendimiento
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en la llamada a OpenAI (Status ${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as any;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("La llamada a OpenAI no retornó ningún contenido.");
  }

  try {
    const parsed = JSON.parse(content) as CustomArticleResult;
    if (!parsed.title || !parsed.contentHtml) {
      throw new Error("El JSON retornado por OpenAI no contiene los campos obligatorios 'title' y 'contentHtml'.");
    }
    return {
      title: parsed.title.trim(),
      summary: (parsed.summary || "").trim(),
      contentHtml: parsed.contentHtml.trim(),
    };
  } catch (e: any) {
    throw new Error(`Error al parsear el JSON generado por OpenAI: ${e.message}. Contenido crudo: ${content}`);
  }
}
