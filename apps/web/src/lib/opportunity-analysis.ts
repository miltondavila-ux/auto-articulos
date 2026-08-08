import type { GoogleSearchAnalyticsRow } from "@auto-articulos/shared";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

interface OpportunityAnalysisGroup {
  categoryId: string;
  rationale: string;
  impressions: number;
  clicks: number;
  titles: Array<{ text: string; rationale: string }>;
}

export type OpportunityAnalysisResult =
  | { status: "ok"; groups: OpportunityAnalysisGroup[] }
  | { status: "no_new" };

// Search Console devuelve el país como código ISO 3166-1 alpha-3 en
// minúsculas. Se traducen los más frecuentes para un sitio en español con
// audiencia en EE. UU. y Latinoamérica; cualquier código no mapeado se le
// pasa igual al modelo (gpt-4o-mini reconoce la mayoría de todas formas).
const COUNTRY_NAMES: Record<string, string> = {
  usa: "Estados Unidos",
  mex: "México",
  col: "Colombia",
  ven: "Venezuela",
  esp: "España",
  arg: "Argentina",
  per: "Perú",
  ecu: "Ecuador",
  chl: "Chile",
  dom: "República Dominicana",
  gtm: "Guatemala",
  hnd: "Honduras",
  slv: "El Salvador",
  nic: "Nicaragua",
  cri: "Costa Rica",
  pan: "Panamá",
  pri: "Puerto Rico",
  bol: "Bolivia",
  ury: "Uruguay",
  pry: "Paraguay",
  cub: "Cuba",
  bra: "Brasil",
  can: "Canadá",
  gbr: "Reino Unido",
  fra: "Francia",
  deu: "Alemania",
  ita: "Italia",
};

function normalizeTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const PROMPT_HEADER = `Actúa como analista senior de Google Search Console y estratega SEO en español. Debes crear clusters long tail que amplíen los artículos que este usuario YA TIENE PUBLICADOS (ver TÍTULOS YA EXISTENTES) y produzcan un efecto de bola de nieve, sin repetir títulos ni provocar canibalización.

REGLA ANTI-INVENCIÓN — LA MÁS IMPORTANTE DE TODAS, APLICA A CUALQUIER DATO ESPECÍFICO, LÉELA CON CUIDADO:
Ya pasó antes que un análisis inventó una lista de títulos mencionando un estado de EE. UU. distinto en cada uno (Georgia, Texas, California, Nevada, Illinois...) sin ninguna evidencia real de que este usuario tenga tráfico o contenido relacionado con esos lugares — eso es fabricar datos y está terminantemente prohibido. La misma regla aplica a CUALQUIER dato específico, no solo ubicaciones: ingredientes, materiales, características de producto, cifras, precios, marcas, profesiones, nacionalidades, situaciones legales o migratorias, fechas, nombres propios, etc.
- NUNCA menciones un dato específico y concreto (ciudad, condado, estado, país, nacionalidad, ingrediente, material, característica, cifra, precio, marca, profesión, etc.) en un título a menos que ese dato EXACTO aparezca literalmente en: (a) el texto de una consulta real, (b) una página real, o (c) un título que este usuario YA publicó (ver TÍTULOS YA EXISTENTES).
- "Suena lógicamente relacionado con la categoría" NO es evidencia. Ejemplo: si la categoría es "Repostería" y existe un título real sobre tortas, SÍ puedes variar la intención de búsqueda de ese mismo tema real ("mejores recetas de torta", "errores comunes al hacer torta"), pero NO puedes agregar ingredientes específicos como "harina sin gluten" o "azúcar de coco" a menos que esas palabras EXACTAS ya aparezcan en una consulta, página o título real — inventar ingredientes/materiales/características que "encajan" temáticamente es exactamente el mismo error que inventar ciudades.
- Los datos de "DISTRIBUCIÓN GEOGRÁFICA REAL" son SOLO por país (Search Console no da ciudad ni estado). NO inventes un estado o ciudad de EE. UU. solo porque "Estados Unidos" aparezca ahí — ese dato únicamente sirve para detectar audiencia real en OTRO país (ej. inversionistas extranjeros), nunca para inventar geografía dentro de un mismo país.
- Si la evidencia no alcanza para un nivel de detalle específico en una categoría puntual, quédate en el nivel de detalle que SÍ esté respaldado (intención de búsqueda genérica sobre el mismo tema real) — es preferible un título menos específico a uno con un dato inventado.
- El campo "rationale" de cada título debe citar o parafrasear muy de cerca la evidencia real (la consulta, página o título existente concreto) que respalda cualquier dato específico que uses. Si no puedes señalar esa evidencia concreta, no la incluyas.

SEGMENTACIÓN AVANZADA (aplícala solo cuando la evidencia real la respalde, según la regla anterior):
Cuando SÍ haya evidencia real, combina hasta tres niveles en el título:
1. Perfil del cliente (quién es, de dónde viene, qué lo distingue).
2. Ubicación real (solo si aparece literalmente en la evidencia, ver regla anti-invención).
3. Producto/servicio/solución concreto (ya visible en categorías, consultas y títulos existentes).
Ejemplos del ESTILO esperado cuando SÍ hay evidencia real de ubicación (son solo referencia de formato, no los copies ni los uses si no aplican a este usuario):
- "Cómo encontrar las mejores escuelas de Miami-Dade si vivo en Broward"
- "Cómo invertir en propiedades en Miami si soy mexicano y vivo en Colombia"

REGLAS OBLIGATORIAS:
- Selecciona como máximo 10 categorías de la lista permitida. Si hay más, prioriza las respaldadas por mayores impresiones y tendencia positiva.
- Devuelve EXACTAMENTE 9 títulos por categoría elegida.
- Cada título debe responder a una intención long tail distinta, ser específico, seguir la regla anti-invención de arriba y estar relacionado con evidencia real de Search Console o con los títulos ya existentes de este usuario.
- No repitas, reformules de manera casi idéntica ni compitas con ningún título existente ni con otra propuesta.
- Usa únicamente categoryId existentes en la lista permitida.
- No inventes estadísticas. impressions y clicks del grupo deben ser la suma aproximada de la evidencia que usaste.
- Si genuinamente no hay evidencia suficiente para armar ni un solo grupo de 9 títulos únicos, no duplicados y sin datos específicos inventados, responde exactamente {"opportunities":[]} — no inventes títulos débiles ni datos falsos (ubicaciones, ingredientes, cifras, características, etc.) solo para llenar el formato.
- Responde SOLO con un objeto JSON válido (sin markdown, sin texto fuera del JSON), con esta forma exacta:
{"opportunities":[{"categoryId":"id","rationale":"explicación breve basada en datos","impressions":123,"clicks":4,"titles":[{"text":"título","rationale":"oportunidad/intención, citando la consulta/página/título existente concreto que respalda cualquier ubicación o perfil de cliente usado"}]}]}`;

async function callOpenAi(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.35,
      max_tokens: 7000,
      // Fuerza al modelo a devolver JSON válido (objeto, no array suelto).
      // Antes de esto, un texto largo generado por el modelo con una
      // comilla o salto de línea sin escapar rompía JSON.parse() con un
      // SyntaxError críptico que se le mostraba tal cual al usuario.
      response_format: { type: "json_object" },
    }),
  });
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(
      data.error?.message ?? "OpenAI no pudo analizar los datos.",
    );
  }
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Aun con response_format:"json_object" el modelo puede, en casos raros,
 * devolver JSON técnicamente inválido (truncado por el límite de tokens,
 * etc.). En vez de fallar de inmediato y mostrarle al usuario un error de
 * parseo críptico, se reintenta una vez antes de darlo por perdido.
 */
async function callOpenAiWithRetry(
  prompt: string,
  apiKey: string,
): Promise<Record<string, unknown>> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await callOpenAi(prompt, apiKey);
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
      lastError = new Error("El análisis no devolvió un objeto JSON válido.");
    } catch (err) {
      lastError = err;
    }
  }
  console.error("analyzeSeoOpportunities: JSON inválido tras reintento:", lastError);
  throw new Error(
    "No se pudo interpretar la respuesta del análisis esta vez. Intenta de nuevo en unos minutos.",
  );
}

export async function analyzeSeoOpportunities(input: {
  categories: Array<{ id: string; name: string }>;
  currentRows: GoogleSearchAnalyticsRow[];
  previousRows: GoogleSearchAnalyticsRow[];
  countryRows: GoogleSearchAnalyticsRow[];
  existingTitles: string[];
}): Promise<OpportunityAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no está configurada.");

  const previous = new Map(
    input.previousRows.map((row) => [row.keys.join(" "), row]),
  );
  const performance = input.currentRows
    .map((row) => {
      const old = previous.get(row.keys.join(" "));
      return {
        query: row.keys[0] ?? "",
        page: row.keys[1] ?? "",
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
        previousImpressions: old?.impressions ?? 0,
        impressionTrend: row.impressions - (old?.impressions ?? 0),
      };
    })
    .sort(
      (a, b) =>
        b.impressions +
        Math.max(0, b.impressionTrend) -
        (a.impressions + Math.max(0, a.impressionTrend)),
    )
    .slice(0, 250);

  const topCountries = input.countryRows
    .map((row) => {
      const code = (row.keys[0] ?? "").toLowerCase();
      return {
        country: COUNTRY_NAMES[code] ?? code,
        impressions: row.impressions,
        clicks: row.clicks,
      };
    })
    .filter((row) => row.country)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20);

  const prompt = `${PROMPT_HEADER}

CATEGORÍAS PERMITIDAS:
${JSON.stringify(input.categories)}

DISTRIBUCIÓN GEOGRÁFICA REAL POR PAÍS (Search Console solo da país, NUNCA ciudad ni estado — úsala solo para detectar audiencia real en OTRO país, nunca para inventar ciudades/estados dentro de un mismo país):
${JSON.stringify(topCountries)}

RENDIMIENTO ACTUAL Y COMPARACIÓN (consulta, página, métricas — solo puedes citar una ciudad/condado/estado si aparece LITERALMENTE en este texto):
${JSON.stringify(performance)}

TÍTULOS YA EXISTENTES (lo que este usuario YA publicó — evidencia real válida para long tail y para cualquier ubicación/perfil que ya hayan usado antes; prohibido repetir o canibalizar):
${JSON.stringify(input.existingTitles.slice(0, 800))}`;

  const parsed = await callOpenAiWithRetry(prompt, apiKey);
  const opportunities = parsed.opportunities;
  if (!Array.isArray(opportunities)) {
    throw new Error("Formato de análisis inválido.");
  }
  if (opportunities.length === 0) {
    return { status: "no_new" };
  }

  const validCategoryIds = new Set(input.categories.map((item) => item.id));
  const selectedCategoryIds = new Set<string>();
  const seen = new Set(input.existingTitles.map(normalizeTitle));
  const result: OpportunityAnalysisGroup[] = [];
  for (const item of opportunities.slice(0, 10)) {
    if (!item || typeof item !== "object") continue;
    const group = item as Record<string, unknown>;
    if (
      typeof group.categoryId !== "string" ||
      !validCategoryIds.has(group.categoryId) ||
      selectedCategoryIds.has(group.categoryId) ||
      !Array.isArray(group.titles)
    )
      continue;
    const titles: OpportunityAnalysisGroup["titles"] = [];
    for (const candidate of group.titles) {
      if (!candidate || typeof candidate !== "object") continue;
      const value = candidate as Record<string, unknown>;
      if (typeof value.text !== "string") continue;
      const text = value.text.trim();
      const normalized = normalizeTitle(text);
      if (!text || seen.has(normalized)) continue;
      seen.add(normalized);
      titles.push({
        text,
        rationale:
          typeof value.rationale === "string" ? value.rationale.trim() : "",
      });
    }
    // Antes se exigía EXACTAMENTE 9 títulos por categoría (lo que el prompt le
    // pide al modelo) y se descartaba el grupo ENTERO si, tras filtrar
    // duplicados contra lo ya publicado, quedaba en 8 o menos. Pedido
    // explícito del usuario (8/8/2026, cuenta de Lorena Álvarez: dejó de
    // recibir oportunidades nuevas y sospechaba que el esquema era muy
    // rígido): para una cuenta con historial largo es fácil que una categoría
    // caiga por debajo de 9 tras el filtro de duplicados aunque sí había
    // oportunidad real, y esa categoría completa se perdía. Ahora se acepta
    // cualquier cantidad de al menos 1 título válido por categoría — mostrar
    // menos títulos reales es preferible a no mostrar la categoría. El
    // enfriamiento de 3 días (ver route.ts) sigue aplicando solo cuando el
    // resultado total es CERO categorías, que es la intención original.
    if (titles.length === 0) continue;
    selectedCategoryIds.add(group.categoryId);
    result.push({
      categoryId: group.categoryId,
      rationale:
        typeof group.rationale === "string" ? group.rationale.trim() : "",
      impressions:
        typeof group.impressions === "number" ? group.impressions : 0,
      clicks: typeof group.clicks === "number" ? group.clicks : 0,
      titles,
    });
  }
  if (result.length === 0) {
    return { status: "no_new" };
  }
  return { status: "ok", groups: result };
}
