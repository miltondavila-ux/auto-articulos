// Traduce el texto propio del usuario (User.articleSignature) al idioma en que
// se está escribiendo el artículo. Pedido explícito del usuario (7/8/2026,
// probando la cuenta de Svetlana Botnarciuc): el artículo salía completo en
// rumano y terminaba con el párrafo de firma en español, lo cual se ve mal.
//
// Mismo enfoque que faqPrompt.ts: OpenAI con gpt-4o-mini, costo despreciable.
// Reglas de diseño, en orden de importancia:
//
// 1. NUNCA bloquear la publicación. Si no hay clave, si la llamada falla o si
//    el modelo devuelve algo vacío, se devuelve el texto ORIGINAL sin traducir.
//    Un artículo con la firma en español es infinitamente mejor que un artículo
//    que no se publica.
// 2. No tocar nada cuando el idioma es español o no está definido — que es el
//    caso de la mayoría de los usuarios actuales.
// 3. Cachear en memoria: la firma de un usuario es siempre la misma, así que
//    traducirla una vez por proceso alcanza, en vez de una vez por artículo.

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

// Clave: `${idioma}::${texto}`. El worker es un proceso corto (una tanda de
// artículos), así que no hace falta expirar nada.
const cache = new Map<string, string>();

/**
 * `languageCode` es el value real del selector de 10minutesWebsite
 * (`User.contentLanguage`): "ro_RO", "en_VI", "es_ES"... No es un código
 * inventado por nosotros, ver fetchLanguages() en automation/10minutesWebsite.
 */
export async function translateText(
  text: string,
  languageCode: string | null | undefined,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  if (!OPENAI_API_KEY) return text;
  if (!languageCode) return text;

  // El idioma por defecto de la plataforma es español y es el de casi todos
  // los usuarios: ahí no hay nada que traducir.
  if (/^es(\b|_|-)/i.test(languageCode)) return text;

  const cacheKey = `${languageCode}::${trimmed}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const prompt = [
    `Traducí el siguiente texto al idioma identificado por el código "${languageCode}".`,
    "Reglas estrictas:",
    "- Mantené los nombres propios tal cual (nombres de personas, empresas, " +
      "marcas, ciudades y nombres de puestos o certificaciones profesionales).",
    "- Mantené el tono y el formato: si hay saltos de línea, conservalos.",
    "- No agregues comillas, comentarios, explicaciones ni markdown.",
    "- No agregues ni quites información.",
    "- Respondé ÚNICAMENTE con la traducción, nada más.",
    "",
    trimmed,
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
        temperature: 0.2,
        max_tokens: 1200,
      }),
    });
    if (!res.ok) return text;

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const translated = (data.choices?.[0]?.message?.content ?? "").trim();
    if (!translated) return text;

    cache.set(cacheKey, translated);
    return translated;
  } catch {
    return text;
  }
}
