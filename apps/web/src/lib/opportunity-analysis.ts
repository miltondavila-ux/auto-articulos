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

function extractYears(value: string): string[] {
  return value.match(/\b(?:19|20)\d{2}\b/g) ?? [];
}

const PROMPT_HEADER = [
  "Actua como estratega SEO experto y analista de datos de busqueda. Tu objetivo es encontrar TODAS las oportunidades posibles para aumentar el trafico organico del usuario, siendo creativo pero siempre basado en evidencia real de los datos proporcionados.",
  "",
  "FILOSOFIA DEL ANALISIS:",
  "- No busques solo lo obvio; analiza patrones, tendencias y oportunidades ocultas",
  "- Infieren temas relacionados basandote en consultas y paginas reales",
  "- Expande cada tema validado hacia un universo de subtemas relacionados que generen un efecto bola de nieve",
  "- Piensa como un usuario real: que mas buscaria alguien que ya busco esto?",
  "- La meta es VOLUMEN de oportunidades reales, no solo las mas faciles",
  "",
  "REGLA OBLIGATORIA DE CATEGORIA (ESTRICTA, sin excepciones):",
  "- Cada titulo que propongas para una categoria debe tratar el MISMO tema que esa categoria, segun su nombre y sus EJEMPLOS DE TITULOS YA PUBLICADOS (van junto a cada categoria en CATEGORIAS PERMITIDAS).",
  "- PROHIBIDO mezclar o combinar en un mismo titulo el tema de dos categorias distintas, y PROHIBIDO poner un titulo en una categoria solo porque una consulta comparte una palabra generica con su nombre.",
  "- Si una consulta real de los datos no encaja tematicamente con NINGUNA categoria permitida, descartala: no la fuerces en la categoria que mas se le parezca.",
  "- PROHIBIDO inventar un titulo que no se pueda justificar con evidencia real presente en RENDIMIENTO ACTUAL (Search Console), SEÑALES DE GOOGLE ANALYTICS o SEÑALES DE BING que se te dan mas abajo. El 'rationale' de cada titulo debe nombrar la consulta, pagina, tendencia o señal concreta que lo respalda.",
  "",
  "REGLA OBLIGATORIA DE CERO CANIBALIZACION (ESTRICTA, sin excepciones):",
  "- Canibalizar significa que dos titulos apuntan a la MISMA pregunta o necesidad principal. NO es canibalizacion pertenecer al mismo universo tematico: un articulo sobre una receta puede abrir subtemas sobre ingredientes, herramientas, tecnicas, errores, conservacion y perfiles de usuario.",
  "- Primero EXPANDE: por cada consulta, pagina o titulo que demuestre interes, investiga subtemas adyacentes, preguntas derivadas, problemas, comparativas, procesos, herramientas, tendencias y perfiles relacionados. Luego revisa los titulos existentes y propuestos para eliminar solo los que respondan la misma intencion principal.",
  "- Trabaja en dos fases internas obligatorias: FASE A, construye un mapa de tema raiz y ramas relacionadas a partir de la evidencia; FASE B, convierte solo las ramas respaldadas en titulos y valida categoria, evidencia y duplicacion de intencion.",
  "- Una rama valida puede cubrir una necesidad complementaria del mismo universo (componentes, preparacion, decision, proceso, riesgos, mantenimiento, resultados o alternativas), aunque no repita las palabras del titulo principal.",
  "- El 'rationale' de cada titulo debe indicar, en una frase, la intencion de busqueda especifica y distinta que cubre (que lo diferencia de los demas titulos de su categoria).",
  "- CERO duplicacion de intencion es un requisito absoluto; no confundas relacion tematica con repeticion. Ante la duda, cambia el angulo hacia una necesidad complementaria respaldada por evidencia en lugar de abandonar toda la expansion del tema.",
  "",
  "REGLA OBLIGATORIA DE LONG TAIL AL 100% (ESTRICTA, sin excepciones):",
  "- PROHIBIDO proponer titulos genericos o de 'cabeza' (head terms cortos, 1-3 palabras, sin especificidad). Todo titulo debe ser long tail: especifico, con intencion clara y, cuando la evidencia lo permita, triple segmentacion (ver mas abajo).",
  "- Revisa la evidencia PAGINA POR PAGINA y CONSULTA POR CONSULTA de Search Console, Google Analytics y Bing (no te quedes solo con las primeras filas que veas): cada señal debe servir para descubrir nuevas necesidades long tail relacionadas, no solo variaciones de la misma frase.",
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
  "   - Identifica temas paraguas y subtemas long tail complementarios",
  "   - Crea contenido que cubra un tema desde multiples angulos realmente distintos",
  "   - Explora la cadena de necesidades: fundamentos, componentes, proceso, errores, comparativas, mantenimiento y preguntas avanzadas",
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
  "- Crear nuevas tematicas long tail derivadas de consultas exitosas, no solo variaciones de redaccion",
  "- Identificar nichos no explotados basados en datos reales",
  "- Usar ubicaciones y perfiles de cliente que aparezcan en las consultas, paginas o titulos existentes",
  "- Proponer intenciones de busqueda nuevas que se infieran de los patrones de las consultas existentes, siempre dentro del tema de la categoria (ver REGLA OBLIGATORIA DE CATEGORIA arriba)",
  "",
  "PRECAUCIONES (no restricciones):",
  "- Si no tienes evidencia directa para un detalle muy especifico (precio exacto, cifra concreta), mantenlo generico pero relevante",
  "",
  "SOLO EVITA:",
  "- Copiar exactamente titulos que ya existen en TITULOS YA EXISTENTES",
  "- Repetir la misma pregunta principal bajo una redaccion diferente (ver REGLA OBLIGATORIA DE CERO CANIBALIZACION arriba)",
  "- Datos completamente falsos sin ninguna base en los datos",
  "- Mezclar el tema de dos categorias en un mismo titulo (ver REGLA OBLIGATORIA DE CATEGORIA)",
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
  "- Cubre TODAS las categorias de CATEGORIAS PERMITIDAS que tengan evidencia real de oportunidad en este lote de datos. NO te limites a un numero fijo de categorias: si hay evidencia real para 15 o 25 categorias distintas, devuelve las 15 o 25.",
  "- Devuelve tantos titulos long tail unicos y no canibalizados por categoria como la evidencia real sostenga. No existe una cantidad fija por categoria: deja que la evidencia, la creatividad y el limite natural de la respuesta determinen cuantas oportunidades son validas.",
  "- Cada titulo debe tener una justificacion basada en datos reales que nombre la intencion de busqueda distinta que cubre",
  "- No inventes años, nacionalidades, ciudades, precios, estadísticas ni perfiles. Un modificador solo puede aparecer en un titulo si está respaldado por una consulta, página o señal real entregada.",
  "- Si la consulta o rama no encaja claramente en la categoria asignada, descártala; nunca la coloques en la categoria más parecida por una palabra compartida.",
  "- CERO canibalizacion, ni dentro del mismo grupo ni contra TITULOS YA EXISTENTES ni contra OPORTUNIDADES YA CREADAS EN ESTA CORRIDA (ver REGLA OBLIGATORIA DE CERO CANIBALIZACION)",
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
      // Subido de 10000 a 16000 (tope real de salida de gpt-4o-mini) porque
      // ahora un lote puede devolver muchas mas categorias/titulos que antes
      // (ya no hay techo fijo de 10 categorias) — pedido de Milton, 2/9/2026.
      max_tokens: 16000,
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
  categories: Array<{ id: string; name: string; publishedExamples?: string[] }>;
  currentRows: GoogleSearchAnalyticsRow[];
  previousRows: GoogleSearchAnalyticsRow[];
  countryRows: GoogleSearchAnalyticsRow[];
  existingTitles: string[];
  googleAnalyticsSummary?: unknown;
  bingSummary?: unknown;
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
  const groupsByCategory = new Map<string, OpportunityAnalysisGroup>();
  const allResult: OpportunityAnalysisGroup[] = [];
  const validCategoryIds = new Set(input.categories.map((item) => item.id));
  const evidenceText = [
    ...input.currentRows,
    ...input.previousRows,
    ...input.countryRows,
  ]
    .map((row) => JSON.stringify(row))
    .join(" ");
  const evidencedYears = new Set(extractYears(evidenceText));

  for (let batchIndex = 0; batchIndex < batchesToProcess.length; batchIndex++) {
    const batch = batchesToProcess[batchIndex];

    // Pedido de Milton (2/9/2026): visibilidad completa de lo ya propuesto
    // EN ESTA CORRIDA, por categoría, para que el chequeo de canibalización
    // cruzado entre lotes sea real y no dependa de una ventana rotativa que
    // podía perder títulos de lotes anteriores.
    const alreadyProposedByCategory = input.categories
      .map((category) => ({
        categoryId: category.id,
        name: category.name,
        titles: groupsByCategory.get(category.id)?.titles.map((t) => t.text) ?? [],
      }))
      .filter((entry) => entry.titles.length > 0);

    const prompt = `${PROMPT_HEADER}

NO HAY TOPE FIJO DE TITULOS POR CATEGORIA: devuelve todas las oportunidades que la evidencia real sostenga, sin repetir intencion.

CATEGORIAS PERMITIDAS (con EJEMPLOS DE TITULOS YA PUBLICADOS por categoria):
${JSON.stringify(input.categories)}

DISTRIBUCION GEOGRAFICA REAL POR PAIS:
${JSON.stringify(topCountries)}

SEÑALES OPCIONALES DE GOOGLE ANALYTICS 4:
${JSON.stringify(input.googleAnalyticsSummary ?? { connected: false })}

SEÑALES OPCIONALES DE BING WEBMASTER TOOLS:
${JSON.stringify(input.bingSummary ?? { connected: false })}

RENDIMIENTO ACTUAL Y COMPARACION (lote ${batchIndex + 1} de ${batchesToProcess.length}):
${JSON.stringify(batch)}

TITULOS YA EXISTENTES (publicados, en toda la cuenta):
${JSON.stringify(input.existingTitles)}

OPORTUNIDADES YA CREADAS EN ESTA CORRIDA, POR CATEGORIA (NO CANIBALIZAR, NO REPETIR):
${JSON.stringify(alreadyProposedByCategory)}`;

    let parsed: Record<string, unknown>;
    try {
      parsed = await callOpenAiWithRetry(prompt, apiKey);
    } catch (err) {
      console.error(`Lote ${batchIndex + 1} fallo, continuando con siguientes lotes:`, err);
      continue;
    }

    const opportunities = parsed.opportunities;
    if (!Array.isArray(opportunities)) continue;

    for (const item of opportunities) {
      if (!item || typeof item !== "object") continue;
      const group = item as Record<string, unknown>;
      if (
        typeof group.categoryId !== "string" ||
        !validCategoryIds.has(group.categoryId) ||
        !Array.isArray(group.titles)
      )
        continue;

      const existingGroup = groupsByCategory.get(group.categoryId);

      const newTitles: OpportunityAnalysisGroup["titles"] = [];
      for (const candidate of group.titles) {
        if (!candidate || typeof candidate !== "object") continue;
        const value = candidate as Record<string, unknown>;
        if (typeof value.text !== "string") continue;
        const text = value.text.trim();
        const normalized = normalizeTitle(text);
        if (!text || seen.has(normalized)) continue;
        // Garantía determinista contra años inventados por la IA.
        if (extractYears(text).some((year) => !evidencedYears.has(year))) continue;
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

  }

  if (allResult.length === 0) {
    return { status: "no_new" };
  }
  return { status: "ok", groups: allResult };
}
