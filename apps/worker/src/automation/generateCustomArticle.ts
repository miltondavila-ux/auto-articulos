import { describeContentLanguage } from "./contentLanguage";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

interface CustomArticleResult {
  title: string;
  summary: string;
  contentHtml: string;
}

/**
 * El editor de 10minutesWebsite muestra las tablas sin un estilo útil en
 * móvil. Convertimos las tablas informativas simples que puede devolver el
 * modelo en listas: conservan cada dato, pero se leen como parte natural del
 * artículo y se adaptan a cualquier ancho de pantalla.
 */
export function convertGeneratedTablesToLists(html: string): string {
  return html.replace(/<table\b[^>]*>([\s\S]*?)<\/table\s*>/gi, (_table, tableBody: string) => {
    const rows = [...tableBody.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)]
      .map((row) => {
        const cells = [...row[1].matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)];
        return cells.length
          ? {
              cells: cells.map((cell) => cell[2].trim()),
              isHeader: cells.every((cell) => cell[1].toLowerCase() === "th"),
            }
          : null;
      })
      .filter((row): row is { cells: string[]; isHeader: boolean } => row !== null);

    if (!rows.length) return "";
    const dataRows = rows[0].isHeader ? rows.slice(1) : rows;
    if (!dataRows.length) return "";

    const items = dataRows
      .map(({ cells }) => {
        const [label, ...details] = cells;
        if (!label) return "";
        const detail = details.filter(Boolean).join(" — ");
        return `<li><strong>${label}</strong>${detail ? `: ${detail}` : ""}</li>`;
      })
      .filter(Boolean)
      .join("");

    return items ? `<ul>${items}</ul>` : "";
  });
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
  const removeScripts = (html: string) =>
    html
      // JSON-LD y scripts del prompt no pertenecen al editor del artículo.
      // Quitarlos conserva el texto visible y evita que el reintento entero
      // falle por un bloque no ejecutable en esta plataforma.
      .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
      // Defensa ante una etiqueta de script incompleta/malformada.
      .replace(/<\/?script\b[^>]*>/gi, "");

  return {
    title: replaceIdentityMarkers(article.title, false).trim(),
    summary: replaceIdentityMarkers(article.summary || "", false).trim(),
    contentHtml: removeScripts(
      convertGeneratedTablesToLists(
        replaceIdentityMarkers(article.contentHtml, true),
      ),
    ).trim(),
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
  const targetLanguage = describeContentLanguage(contentLanguage);
  const currentDate = new Date().toISOString().slice(0, 10);
  const userPrompt = `${customInstructions}\n\nMANDATORY TOPIC: "${titleText}". Write only about this topic, even if the custom instructions do not include {title} or {keyword}. The topic may be written in another language; translate it internally and do not copy its language into the output.`;

  const systemPrompt = `You are an expert SEO and digital marketing writer.
Write a complete, high-quality blog article in ${targetLanguage} (platform language code: "${contentLanguage}") while following the user's custom instructions strictly.

DATE CONTEXT: Today is ${currentDate}. Treat this as the current date for all temporal references. Do not present an old date, past year, expired deadline, or historical "current" context as if it were current. Only include a specific older date when it is essential to the topic and clearly label it as historical; otherwise use current/future-neutral wording. Never invent dates.

LANGUAGE REQUIREMENT: Every user-visible word in the title, summary, and contentHtml MUST be written in ${targetLanguage}. The topic, brand names, proper names, and custom instructions may be written in another language; translate them internally. Do not mix languages, do not quote the language of the input instructions, and do not add a translation or language note. Only retain an unavoidable proper name or official brand name in its original form.

Respond ONLY as JSON with exactly this structure:
{
  "title": "The final or optimized article title (maximum 200 characters)",
  "summary": "A short, engaging SEO excerpt from 150 to 280 characters",
  "contentHtml": "The article body as clean HTML. Use semantic tags such as <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>. For comparisons use lists with bold labels; do NOT use <table>, <tr>, <th>, or <td>. Do NOT include full-document tags such as <html>, <head>, <body>, <!DOCTYPE>, or markdown code fences such as \`\`\`html."
}

Make sure the generated HTML is valid and clean.`;

  const safetyRules = `

Mandatory limits so the result can be saved safely:
- Write no more than 1,200 words in contentHtml.
- Do not include <script>, JSON-LD, CSS, QR codes, contact buttons, or tel:/wa.me links; Auto Artículos adds real contact data safely.
- Do not use HTML tables. If you need to highlight data, write a short, clear list with the datum in <strong> followed by its explanation.
- Do not use personal-data markers; Auto Artículos resolves them safely if they appear.
- Escape every quote inside the JSON contentHtml value correctly.
- Keep every user-visible word in title, summary, and contentHtml in ${targetLanguage}, except unavoidable proper names or official brand names.`;

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
                : `${userPrompt}\n\nRetry: return a more concise article as complete JSON, without markers or structured code.`,
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
      return sanitizeGeneratedArticleResult(parsed, authorName);
    } catch (error) {
      lastError = `OpenAI devolvió JSON inválido: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  throw new Error(`OpenAI no pudo generar un artículo válido tras dos intentos: ${lastError}`);
}
