// Traduce CUALQUIER error crudo de la automatización (timeouts de Playwright,
// respuestas HTTP, excepciones de red) a un mensaje que un usuario sin
// conocimiento técnico pueda entender, con UNA acción concreta que esté a su
// alcance (dentro de su propia cuenta: Configuración, Oportunidades, esperar
// el próximo reintento automático). Nunca sugiere algo fuera de su alcance
// (contactar a un administrador, tocar código, revisar logs del servidor).
//
// Reemplaza el enfoque anterior de ir agregando un regex + mensaje fijo por
// cada error nuevo que aparecía (ver historial de este archivo en queue.ts):
// pedido explícito de Milton (18/9/2026), cada error nuevo se traduce
// dinámicamente en vez de esperar a que alguien lo detecte y le escriba un
// mensaje a mano.
//
// Mismo enfoque que translateText.ts: OpenAI gpt-4o-mini, costo despreciable.
// Reglas de diseño, en orden de importancia:
//
// 1. NUNCA bloquear ni retrasar la automatización. Si no hay clave, si la
//    llamada falla, tarda o el modelo devuelve algo vacío, se devuelve el
//    mensaje ORIGINAL sin tocar. Un error técnico crudo es infinitamente
//    mejor que una publicación que se traba esperando a la IA.
// 2. Cachear en memoria por el texto exacto del error: el worker procesa
//    muchos títulos en el mismo proceso y el mismo error técnico (timeout,
//    falta de créditos, etc.) se repite tal cual entre reintentos y usuarios.

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const cache = new Map<string, string>();

const TIMEOUT_MS = 8000;

export async function humanizeAutomationError(
  rawMessage: string,
  platformName: string,
): Promise<string> {
  const trimmed = rawMessage.trim();
  if (!trimmed) return rawMessage;
  if (!OPENAI_API_KEY) return rawMessage;

  const cached = cache.get(trimmed);
  if (cached) return cached;

  const prompt = [
    `Sos el traductor de errores técnicos de una plataforma de publicación automática de artículos en "${platformName}".`,
    "Te llega el mensaje de error TAL CUAL lo produjo el código (puede ser un timeout de automatización de navegador, un error HTTP, o una excepción).",
    "Tu tarea: reescribirlo para que lo entienda una persona SIN conocimiento técnico, en 1-3 frases cortas, en español neutro, sin jerga (nada de 'locator', 'timeout', 'selector', 'HTTP', stack traces).",
    "Después agregá UNA acción concreta que la persona pueda hacer ELLA MISMA, dentro de su propia cuenta (por ejemplo: revisar usuario/contraseña en Configuración, esperar el próximo intento automático, revisar créditos de imagen, revisar el título en Oportunidades).",
    "PROHIBIDO sugerir acciones fuera de su alcance: nunca digas 'contacta a un administrador', 'revisa los logs del servidor', 'contacta soporte técnico de la plataforma de desarrollo' ni nada que la persona no pueda resolver sola desde su cuenta.",
    "Si el mensaje ya es un simple problema pasajero del sitio (el sitio no respondió a tiempo) y no hay nada que la persona deba corregir, decilo así y aclará que el sistema reintenta solo, sin pedirle ninguna acción.",
    "Respondé ÚNICAMENTE con el mensaje final para el usuario, sin comillas, sin markdown, sin prefijos como 'Mensaje:'.",
    "",
    `Mensaje técnico original: ${trimmed}`,
  ].join("\n");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!response.ok) return rawMessage;
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const humanized = data.choices?.[0]?.message?.content?.trim();
    if (!humanized) return rawMessage;

    cache.set(trimmed, humanized);
    return humanized;
  } catch {
    return rawMessage;
  }
}
