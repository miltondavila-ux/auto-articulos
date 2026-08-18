const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

interface CustomArticleResult {
  title: string;
  summary: string;
  contentHtml: string;
}

/**
 * Los estilos corporativos existentes pueden pedir marcadores de identidad.
 * Nunca deben hacer fallar toda la generación: el teléfono se resuelve más
 * adelante con el dato real del perfil y el nombre se conoce en el worker.
 */
export function sanitizeGeneratedArticleResult(
  article: CustomArticleResult,
  authorName?: string | null,
): CustomArticleResult {
  const replaceIdentityMarkers = (value: string, preservePhone: boolean) =>
    value
      .replace(
        /\{(?:TELEFONO|PHONE_NUMBER|NUMERO-WHATSAPP)\}/gi,
        preservePhone ? "PHONE_NUMBER" : "",
      )
      .replace(/\{NOMBRE_AUTOR\}/gi, authorName?.trim() || "")
      // Aún no existe un campo de ciudad en User; nunca dejamos el marcador
      // crudo en el artículo mientras ese dato no esté configurado.
      .replace(/\{CIUDAD_ESTADO\}/gi, "");

  return {
    title: replaceIdentityMarkers(article.title, false).trim(),
    summary: replaceIdentityMarkers(article.summary || "", false).trim(),
    contentHtml: replaceIdentityMarkers(article.contentHtml, true).trim(),
  };
}

export async function generateCustomArticle(
  titleText: string,
  promptTemplate: string,
  contentLanguage: string,
  authorName?: string | null,
): Promise<CustomArticleResult> {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "La clave de API de OpenAI (OPENAI_API_KEY) no está configurada en las variables de entorno."
    );
  }

  // Reemplazar placeholders en el prompt del usuario
  const customInstructions = promptTemplate
    .replace(/{title}/gi, titleText)
    .replace(/{keyword}/gi, titleText);
  const userPrompt = `${customInstructions}\n\nTEMA OBLIGATORIO: "${titleText}". Escribe únicamente sobre este tema, aunque las instrucciones personalizadas no incluyan {title} ni {keyword}.`;

  const systemPrompt = `Eres un redactor experto en SEO y marketing digital.
Tu tarea es escribir un artículo de blog completo de alta calidad en el idioma "${contentLanguage}", siguiendo de manera estricta las instrucciones dadas por el usuario.

Debes responder ÚNICAMENTE en formato JSON con la siguiente estructura exacta:
{
  "title": "El título final u optimizado para el artículo (máximo 200 caracteres)",
  "summary": "Un resumen/extracto corto y atractivo para SEO, de 150 a 280 caracteres",
  "contentHtml": "El cuerpo del artículo redactado en formato HTML limpio. Utiliza etiquetas semánticas como <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>. NO incluyas etiquetas estructurales de documento completo como <html>, <head>, <body>, <!DOCTYPE>, ni bloques de código markdown como \`\`\`html."
}

Asegúrate de que el HTML generado sea válido y esté limpio.`;

  const safetyRules = `

Límites obligatorios para que el resultado pueda guardarse correctamente:
- Escribe un máximo de 1.200 palabras en contentHtml.
- No incluyas <script>, JSON-LD, CSS, códigos QR, botones de contacto ni enlaces tel:/wa.me: Auto Artículos añade los datos de contacto reales de forma segura.
- No uses marcadores de datos personales; Auto Artículos los resuelve de forma segura si aparecieran.
- Escapa correctamente cualquier comilla dentro del valor JSON de contentHtml.`;

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt + safetyRules },
          {
            role: "user",
            content:
              attempt === 0
                ? userPrompt
                : `${userPrompt}\n\nReintento: responde con un artículo más conciso y JSON completo, sin marcadores ni código estructurado.`,
          },
        ],
        temperature: 0.5,
        max_tokens: 10000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error en la llamada a OpenAI (Status ${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: { finish_reason?: string | null; message?: { content?: string } }[];
    };
    const choice = data.choices?.[0];
    const content = choice?.message?.content;

    if (!content) {
      lastError = "OpenAI no retornó contenido.";
      continue;
    }
    if (choice?.finish_reason === "length") {
      lastError = "OpenAI alcanzó el límite de longitud antes de completar el JSON.";
      continue;
    }

    try {
      const parsed = JSON.parse(content) as CustomArticleResult;
      if (!parsed.title || !parsed.contentHtml) {
        lastError = "El JSON retornado por OpenAI no contiene título y contenido completos.";
        continue;
      }
      if (/<script\b/i.test(parsed.contentHtml)) {
        lastError = "OpenAI devolvió código script no permitido en el artículo.";
        continue;
      }
      return sanitizeGeneratedArticleResult(parsed, authorName);
    } catch (error) {
      lastError = `OpenAI devolvió JSON inválido: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  throw new Error(`OpenAI no pudo generar un artículo válido tras dos intentos: ${lastError}`);
}
