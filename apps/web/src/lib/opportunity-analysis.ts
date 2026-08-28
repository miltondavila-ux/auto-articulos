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
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isFullyStocked(
  groupsByCategory: Map<string, OpportunityAnalysisGroup>,
  maxTitlesPerCategory: number,
): boolean {
  if (groupsByCategory.size < 10) return false;
  for (const group of groupsByCategory.values()) {
    if (group.titles.length < maxTitlesPerCategory) return false;
  }
  return true;
}

const PROMPT_HEADER = [
  "Actua como estratega SEO experto y analista de datos de busqueda. Tu objetivo es encontrar TODAS las oportunidades posibles para aumentar el trafico organico del usuario, siendo creativo pero siempre basado en evidencia real de los datos proporcionados.",
  "",
  "FILOSOFIA DEL ANALISIS:",
  "- No busques solo lo obvio; analiza patrones, tendencias y oportunidades ocultas",
  "- Infieren temas relacionados basandote en consultas y paginas reales",
  "- Crea clusters tematicos que generen un efecto bola de nieve",
  "- Piensa como un usuario real: que mas buscaria alguien que ya busco esto?",
  "- La meta es VOLUMEN de oportunidades reales, no solo las mas faciles",
  "",
  "ANALISIS INTELIGENTE REQUERIDO:",
  "",
  "1. CONSULTAS DE ALTO POTENCIAL (prioridad maxima):",
  "   - Consultas con impresiones altas pero clics bajos (oportunidad de optimizacion)",
  "   - Consultas en posiciones 2-10 (faciles de mejorar con buen contenido)",
  "   - Consultas con tendencia creciente mes a mes",
  "",
  "2. CLUSTERS TEMATICOS:",
  "   - Agrupa consultas relacionadas entre si",
  "   - Identifica temas paraguas y sus variantes long tail",
  "   - Crea contenido que cubra un tema desde multiples angulos",
  "",
  "3. OPORTUNIDADES DE LONG TAIL:",
  "   - Transforma consultas genericas en especificas",
  '   - Agrega modificadores: "como", "mejores", "errores", "guia completa", "ejemplos"',
  "   - Personaliza segun perfil de cliente y ubicacion (cuando haya evidencia real)",
  "",
  "4. ANALISIS DE COMPETENCIA IMPLICITO:",
  "   - Si una posicion es 5-10, hay 4+ competidores arriba = oportunidad de superarlos",
  "   - Si CTR es bajo para impressions altas, el titulo/meta necesita mejorar",
  "",
  "REGLAS FLEXIBLES (NO restrictivas):",
  "",
  "SI PUEDES:",
  "- Inferir temas relacionados a partir de patrones en las consultas",
  "- Sugerir contenido que complemente lo que ya existe",
  "- Crear variaciones long tail de consultas exitosas",
  "- Identificar nichos no explotados basados en datos reales",
  "- Usar ubicaciones y perfiles de cliente que aparezcan en las consultas, paginas o titulos existentes",
  "- Combinar temas de diferentes categorias cuando tenga sentido",
  "- Proponer intenciones de busqueda nuevas que se infieran de los patrones de las consultas existentes",
  "",
  "PRECAUCIONES (no restricciones):",
  "- Evita repetir titulos existentes o canibalizarlos internamente",
  "- Cada titulo debe ser UNICO y no superponerse con otros",
  "- Si no tienes evidencia directa para un detalle muy especifico (precio exacto, cifra concreta), mantenlo generico pero relevante",
  "",
  "SOLO EVITA:",
  "- Copiar exactamente titulos que ya existen en TITULOS YA EXISTENTES",
  "- Crear 2+ titulos dentro del mismo grupo que compitan por la misma intencion de busqueda",
  "- Datos completamente falsos sin ninguna base en los datos",
  "",
  "TRIPLE SEGMENTACION (REGLA CLAVE - aplicar en TODOS los titulos):",
  "Cada titulo debe combinar naturalmente 3 niveles cuando la evidencia lo permita:",
  "1. ACCION/INTENCION: Que quiere hacer el usuario (comprar, elegir, comparar, aprender, evitar errores)",
  "2. UBICACION/CONTEXTO: Donde o en que situacion (ciudad, pais, contexto legal, tipo de seguro, etc.)",
  "3. PERFIL DEL CLIENTE: Quien es el usuario (inmigrante, colombiano que vive en Colombia, primerizos, familiar, etc.)",
  "",
  "Ejemplos de TRIPLE SEGMENTACION bien aplicada:",
  '- "Como comprar una propiedad en Cali Colombia si soy colombiano y vivo en Colombia"',
  '- "Mejores seguros de salud para inmigrantes venezolanos en Miami"',
  '- "Errores comunes al elegir seguro de vida siendo mayor de 50 anos en California"',
  '- "Guia completa para comparar seguros de auto siendo joven universitario"',
  "",
  "REGLA DE ORO: La triple segmentacion debe sonar NATURAL, no forzada. Si la evidencia no respalda un nivel, omítelo pero mantén los otros dos.",
  "",
  "REGLAS OBLIGATORIAS:",
  "- Selecciona como maximo 10 categorias (prioriza por volumen total de oportunidad)",
  "- Devuelve 5-9 titulos por categoria (calidad sobre cantidad fija)",
  "- Cada titulo debe tener una justificacion basada en datos reales",
  "- Evita canibalizacion entre titulos del MISMO grupo",
  "- Usa unicamente categoryId existentes en la lista permitida",
  "- impressions y clicks del grupo deben ser representativos de la evidencia usada",
  "",
  "FORMATO DE RESPUESTA:",
  "Responde SOLO con JSON valido (sin markdown, sin texto adicional):",
  '{"opportunities":[{"categoryId":"id","rationale":"analisis de oportunidad basado en datos","impressions":123,"clicks":4,"titles":[{"text":"titulo long tail inteligente","rationale":"justificacion con datos reales que respalda esta oportunidad"}]}]}',
  "",
  'Si genuinamente no hay datos suficientes para crear oportunidades reales, responde: {"opportunities":[]}',
].join("\n");

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
      temperature: 0.4,
      max_tokens: 10000,
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
      lastError = new Error("El analisis no devolvio un objeto JSON valido.");
    } catch (err) {
      lastError = err;
    }
  }
  console.error("analyzeSeoOpportunities: JSON invalido tras reintento:", lastError);
  throw new Error(
    "No se pudo interpretar la respuesta del analisis esta vez. Intenta de nuevo en unos minutos.",
  );
}

interface ProcessedRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  previousImpressions: number;
  impressionTrend: number;
  opportunityScore: number;
}

function processPerformanceData(
  currentRows: GoogleSearchAnalyticsRow[],
  previousRows: GoogleSearchAnalyticsRow[],
): ProcessedRow[] {
  const previous = new Map(
    previousRows.map((row) => [row.keys.join(" "), row]),
  );

  return currentRows
    .map((row) => {
      const old = previous.get(row.keys.join(" "));
      const impressions = row.impressions;
      const clicks = row.clicks;
      const ctr = row.ctr;
      const position = row.position;
      const previousImpressions = old?.impressions ?? 0;
      const impressionTrend = impressions - previousImpressions;

      let opportunityScore = 0;

      if (impressions > 100 && clicks < 5) {
        opportunityScore += 30;
      }
      if (position >= 2 && position <= 10) {
        opportunityScore += 25;
      }
      if (impressionTrend > 10) {
        opportunityScore += 20;
      }
      if (impressions > 50) {
        opportunityScore += 15;
      }
      if (position <= 10 && ctr < 0.05) {
        opportunityScore += 10;
      }

      return {
        query: row.keys[0] ?? "",
        page: row.keys[1] ?? "",
        clicks,
        impressions,
        ctr,
        position,
        previousImpressions,
        impressionTrend,
        opportunityScore,
      };
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore);
}

function buildPerformanceBatches(
  allRows: GoogleSearchAnalyticsRow[],
  previousRows: GoogleSearchAnalyticsRow[],
  batchSize: number,
): Array<Array<ProcessedRow>> {
  const processed = processPerformanceData(allRows, previousRows);
  const batches: Array<Array<ProcessedRow>> = [];
  for (let i = 0; i < processed.length; i += batchSize) {
    batches.push(processed.slice(i, i + batchSize));
  }
  return batches;
}

export async function analyzeSeoOpportunities(input: {
  categories: Array<{ id: string; name: string }>;
  currentRows: GoogleSearchAnalyticsRow[];
  previousRows: GoogleSearchAnalyticsRow[];
  countryRows: GoogleSearchAnalyticsRow[];
  existingTitles: string[];
  googleAnalyticsSummary?: unknown;
}): Promise<OpportunityAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no esta configurada.");

  const BATCH_SIZE = 250;
  const MAX_BATCHES = 20;
  const batches = buildPerformanceBatches(
    input.currentRows,
    input.previousRows,
    BATCH_SIZE,
  );
  const batchesToProcess = batches.slice(0, MAX_BATCHES);

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

  const seen = new Set(input.existingTitles.map(normalizeTitle));
  // Bug real encontrado el 11/8/2026 (cuenta de Lorena Álvarez, dejó de
  // recibir oportunidades nuevas): antes, apenas un lote proponía ALGO para
  // una categoría (aunque fuera poco), esa categoría quedaba "cerrada" para
  // el resto de los hasta 20 lotes restantes — descartando datos reales
  // buenos de lotes posteriores solo porque un lote anterior llegó primero.
  // Ahora cada categoría acumula títulos de TODOS los lotes (hasta el tope
  // por categoría de abajo), no solo del primero que la mencionó.
  const MAX_TITLES_PER_CATEGORY = 9;
  const groupsByCategory = new Map<string, OpportunityAnalysisGroup>();
  const allResult: OpportunityAnalysisGroup[] = [];

  for (let batchIndex = 0; batchIndex < batchesToProcess.length; batchIndex++) {
    const batch = batchesToProcess[batchIndex];

    const prompt = `${PROMPT_HEADER}

CATEGORIAS PERMITIDAS:
${JSON.stringify(input.categories)}

DISTRIBUCION GEOGRAFICA REAL POR PAIS:
${JSON.stringify(topCountries)}

SEÑALES OPCIONALES DE GOOGLE ANALYTICS 4:
${JSON.stringify(input.googleAnalyticsSummary ?? { connected: false })}

RENDIMIENTO ACTUAL Y COMPARACION (lote ${batchIndex + 1} de ${batchesToProcess.length}):
${JSON.stringify(batch)}

TITULOS YA EXISTENTES:
${JSON.stringify(input.existingTitles.slice(0, 800))}

TITULOS YA PROPUESTOS EN ESTA SESION (NO REPETIR):
${JSON.stringify(Array.from(seen).slice(-200))}`;

    let parsed: Record<string, unknown>;
    try {
      parsed = await callOpenAiWithRetry(prompt, apiKey);
    } catch (err) {
      console.error(`Lote ${batchIndex + 1} fallo, continuando con siguientes lotes:`, err);
      continue;
    }

    const opportunities = parsed.opportunities;
    if (!Array.isArray(opportunities)) continue;

    const validCategoryIds = new Set(input.categories.map((item) => item.id));

    for (const item of opportunities.slice(0, 10)) {
      if (!item || typeof item !== "object") continue;
      const group = item as Record<string, unknown>;
      if (
        typeof group.categoryId !== "string" ||
        !validCategoryIds.has(group.categoryId) ||
        !Array.isArray(group.titles)
      )
        continue;

      const existingGroup = groupsByCategory.get(group.categoryId);
      // Categoría nueva (no vista todavía) pero ya llegamos al máximo de 10
      // categorías distintas: no la agregamos. Si YA existe, sí seguimos
      // sumándole títulos de este lote aunque ya hayamos llegado a 10.
      if (!existingGroup && groupsByCategory.size >= 10) continue;

      const remainingSlots =
        MAX_TITLES_PER_CATEGORY - (existingGroup?.titles.length ?? 0);
      if (remainingSlots <= 0) continue;

      const newTitles: OpportunityAnalysisGroup["titles"] = [];
      for (const candidate of group.titles) {
        if (newTitles.length >= remainingSlots) break;
        if (!candidate || typeof candidate !== "object") continue;
        const value = candidate as Record<string, unknown>;
        if (typeof value.text !== "string") continue;
        const text = value.text.trim();
        const normalized = normalizeTitle(text);
        if (!text || seen.has(normalized)) continue;
        seen.add(normalized);
        newTitles.push({
          text,
          rationale:
            typeof value.rationale === "string" ? value.rationale.trim() : "",
        });
      }

      if (newTitles.length === 0) continue;

      if (existingGroup) {
        existingGroup.titles.push(...newTitles);
      } else {
        const newGroup: OpportunityAnalysisGroup = {
          categoryId: group.categoryId,
          rationale:
            typeof group.rationale === "string" ? group.rationale.trim() : "",
          impressions:
            typeof group.impressions === "number" ? group.impressions : 0,
          clicks: typeof group.clicks === "number" ? group.clicks : 0,
          titles: newTitles,
        };
        groupsByCategory.set(group.categoryId, newGroup);
        allResult.push(newGroup);
      }
    }

    if (isFullyStocked(groupsByCategory, MAX_TITLES_PER_CATEGORY)) break;
  }

  if (allResult.length === 0) {
    return { status: "no_new" };
  }
  return { status: "ok", groups: allResult };
}
