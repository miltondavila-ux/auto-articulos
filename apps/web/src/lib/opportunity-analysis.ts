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

// Garantía determinista ABSOLUTA, independiente de la evidencia (7/9/2026,
// pedido explícito de Milton tras encontrar "...Comparativa 2023" en una
// corrida real en 2026): que un año aparezca en alguna fila de evidencia NO
// alcanza para justificarlo en un título nuevo si ese año ya quedó viejo —
// un artículo publicado HOY con un año de hace 3 años se ve desactualizado
// sin importar qué tan real sea la consulta que lo originó (Search Console
// puede seguir mostrando una consulta antigua "seguro salud 2023" con
// impresiones reales incluso hoy). Solo se permite el año actual, el
// anterior y el siguiente (cubre "guías 2025/2026/2027" sin quedar
// desactualizado ni inventar el futuro lejano).
function isYearAcceptablyRecent(year: string): boolean {
  const currentYear = new Date().getUTCFullYear();
  const parsed = Number(year);
  return parsed >= currentYear - 1 && parsed <= currentYear + 1;
}

const INTENT_FILLER_WORDS = new Set([
  "al", "algunas", "como", "completa", "completo", "comunes", "con",
  "consejos", "de", "el", "en", "errores", "guia", "las", "lo", "los",
  "para", "pasos", "practica", "que", "sobre", "todo", "tu", "una", "un",
  "y", "evitarlos", "evitar", "salud", "forma", "formas", "necesitas", "hacer",
  "despues", "antes", "tras", "cuando", "inmigrantes", "inmigrante",
]);

function stemIntentToken(token: string): string {
  const canonical: Record<string, string> = {
    elegir: "seleccion",
    elige: "seleccion",
    mejor: "seleccion",
    mejores: "seleccion",
    opciones: "seleccion",
    errores: "problema",
    error: "problema",
    problemas: "problema",
    soluciones: "problema",
  };
  if (canonical[token]) return canonical[token];
  if (token.length > 5 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function intentTokens(value: string): Set<string> {
  return new Set(
    normalizeTitle(value)
      .split(" ")
      .filter((token) => token.length > 2 && !INTENT_FILLER_WORDS.has(token))
      .map(stemIntentToken),
  );
}

function tokenSetsOverlap(
  left: Set<string>,
  right: Set<string>,
  minTokens: number,
  minRatio: number,
): boolean {
  if (left.size < minTokens || right.size < minTokens) return false;
  const intersection = [...left].filter((token) => right.has(token)).length;
  // La intersección sobre el conjunto menor detecta variantes que solo
  // agregan formato, ubicación o perfil a la misma necesidad principal.
  const smaller = Math.min(left.size, right.size);
  return intersection >= minTokens && intersection / smaller >= minRatio;
}

// Comparación laxa por raíz de palabra (primeros ~6 caracteres), no por
// coincidencia exacta de token — necesaria porque el stemmer de arriba solo
// quita plurales simples ("s"/"es"), no variantes reales del español como
// "embarazo" vs "embarazada" o "inmigrante" vs "inmigración". Sin esto, un
// título legítimo sobre embarazo podía quedar "sin vocabulario compartido"
// con su propia categoría solo por usar una palabra emparentada distinta.
function sharesWordRoot(a: string, b: string): boolean {
  const minLen = Math.min(a.length, b.length);
  if (minLen < 5) return a === b;
  const prefixLen = Math.min(6, minLen);
  return a.slice(0, prefixLen) === b.slice(0, prefixLen);
}

function tokensShareRoot(a: Set<string>, b: Set<string>): boolean {
  for (const tokenA of a) {
    for (const tokenB of b) {
      if (sharesWordRoot(tokenA, tokenB)) return true;
    }
  }
  return false;
}

// Firma estructurada de intención: el modelo declara, por cada título, un
// "needKey" corto (objeto + contexto + perfil + ubicación real, SIN verbo ni
// formato) que representa la necesidad que resuelve. Al ser una etiqueta
// deliberadamente compacta y ya limpia de ruido (a diferencia del título
// completo, donde "mudarse" vs "mudarte" o "elegir" vs "entender" rompen la
// comparación léxica), el cruce de tokens entre dos needKey es una señal de
// canibalización mucho más confiable que compararlos por el título crudo.
interface IntentSignature {
  needKeyNormalized: string | null;
  tokens: Set<string>;
  source: string;
}

function buildIntentSignature(source: string, needKey?: string): IntentSignature {
  const key = needKey?.trim();
  return {
    needKeyNormalized: key ? normalizeTitle(key) : null,
    tokens: intentTokens(key && key.length > 0 ? key : source),
    source,
  };
}

function collidesWithIntent(
  candidate: IntentSignature,
  existing: IntentSignature[],
): boolean {
  for (const signature of existing) {
    // Coincidencia exacta de needKey: la señal más fuerte, independiente del
    // umbral de tokens (dos títulos que declaran la MISMA necesidad nunca
    // pueden coexistir, sin importar cuán distinto sea el texto visible).
    if (
      candidate.needKeyNormalized &&
      signature.needKeyNormalized &&
      candidate.needKeyNormalized === signature.needKeyNormalized
    ) {
      return true;
    }
    // CORRECCION 2026-09-09: Si AMBOS tienen needKey y son DISTINTOS, usar
    // umbral RELAJADO (0.5) para permitir LONGTAIL legítimo que comparte
    // palabras pero tiene necesidades distintas (ingredientes vs proceso).
    // Esto confía en que needKey distintos = necesidades distintas, sin requerir
    // similitud de tokens baja.
    const minTokens = 3;
    let minRatio = 0.67;
    if (candidate.needKeyNormalized && signature.needKeyNormalized) {
      // Si ambos tienen needKey explícito (ambos declarados por OpenAI),
      // el modelo ya filtró duplicados obvios. Bajar umbral para LONGTAIL.
      minRatio = 0.5;
    }
    if (tokenSetsOverlap(candidate.tokens, signature.tokens, minTokens, minRatio)) {
      return true;
    }
  }
  return false;
}

function hasContextualEvidenceForYear(
  title: string,
  year: string,
  rows: GoogleSearchAnalyticsRow[],
): boolean {
  const titleTokens = intentTokens(title);
  return rows.some((row) => {
    const serialized = JSON.stringify(row);
    if (!serialized.includes(year)) return false;
    const evidenceTokens = intentTokens(serialized);
    const shared = [...titleTokens].filter((token) => evidenceTokens.has(token));
    return shared.length >= 2;
  });
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
  "- Las consultas de leyes, regulaciones, impuestos o cumplimiento solo pueden asignarse a una categoria cuyo nombre o ejemplos publicados indiquen explicitamente ese ambito legal/fiscal; si no existe esa categoria, descartalas aunque compartan ciudad, pais o perfil con otra categoria.",
  "- PROHIBIDO inventar un titulo que no se pueda justificar con evidencia real presente en RENDIMIENTO ACTUAL (Search Console), SEÑALES DE GOOGLE ANALYTICS o SEÑALES DE BING que se te dan mas abajo. El 'rationale' de cada titulo debe nombrar la consulta, pagina, tendencia o señal concreta que lo respalda.",
  "",
  "REGLA OBLIGATORIA DE CERO CANIBALIZACION (ESTRICTA, sin excepciones):",
  "- Canibalizar significa que dos titulos apuntan a la MISMA pregunta o necesidad principal. NO es canibalizacion pertenecer al mismo universo tematico: un articulo sobre una receta puede abrir subtemas sobre ingredientes, herramientas, tecnicas, errores, conservacion y perfiles de usuario.",
  "- Primero EXPANDE: por cada consulta, pagina o titulo que demuestre interes, investiga subtemas adyacentes, preguntas derivadas, problemas, comparativas, procesos, herramientas, tendencias y perfiles relacionados. Luego revisa los titulos existentes y propuestos para eliminar solo los que respondan la misma intencion principal.",
  "- Trabaja en dos fases internas obligatorias: FASE A, construye un mapa de tema raiz y ramas relacionadas a partir de la evidencia; FASE B, convierte solo las ramas respaldadas en titulos y valida categoria, evidencia y duplicacion de intencion.",
  "- Una rama valida puede cubrir una necesidad complementaria del mismo universo (componentes, preparacion, decision, proceso, riesgos, mantenimiento, resultados o alternativas), aunque no repita las palabras del titulo principal.",
  "- El 'rationale' de cada titulo debe indicar, en una frase, la intencion de busqueda especifica y distinta que cubre (que lo diferencia de los demas titulos de su categoria).",
  "- OBLIGATORIO: cada titulo debe declarar tambien un campo 'needKey', una etiqueta corta en snake_case (3 a 6 palabras) que resuma UNICAMENTE el objeto + contexto + perfil + ubicacion real que resuelve el titulo (ej: seguro_salud_cambio_tras_mudanza_estado, seguro_salud_deducible_inmigrante_miami, seguro_pequeno_negocio_empleados). El needKey NUNCA debe incluir verbos de accion (elegir, comparar, entender, evitar) ni palabras de formato (guia, errores, comunes, mejores, consejos, pasos, completa, opciones) ni el año — esas palabras no cambian la necesidad.",
  "- Dos titulos con el MISMO needKey (aunque su texto visible sea distinto) son SIEMPRE la misma oportunidad, sin importar si estan en la misma categoria o en categorias distintas. Antes de proponer un titulo, compara mentalmente su needKey contra el de TODOS los demas titulos que vas a entregar en esta respuesta y contra OPORTUNIDADES YA CREADAS EN ESTA CORRIDA (de cualquier categoria, no solo la actual): si coincide o es casi identico, descarta el titulo o cambia genuinamente el contexto/perfil/ubicacion real (con evidencia) para que el needKey sea distinto de verdad.",
  "- Antes de entregar cada titulo, resume mentalmente su NECESIDAD PRINCIPAL en pocas palabras (eso es el needKey). Si coincide con otro titulo aunque cambien el formato, el verbo, el perfil, la ciudad o el año, descártalo.",
  "- No conviertas una misma necesidad en varias piezas cambiando solo 'guía', 'errores comunes', 'cómo elegir', 'consejos', 'pasos', 'mejores' o 'completa'. Esas palabras no crean una oportunidad nueva ni cambian el needKey.",
  "- Prioriza ramas que abran preguntas complementarias reales: preparación, componentes, decisiones, costos, riesgos, mantenimiento, alternativas, casos de uso, diagnóstico y resultados. Cada rama debe resolver una necesidad distinta y estar respaldada por una señal concreta.",
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
  "REGLA OBLIGATORIA DE GEOLOCALIZACION ULTRA ESPECIFICA (cuando el dueño de la cuenta declaro UBICACIONES DE CLIENTES y/o UBICACIONES DEL NEGOCIO mas abajo):",
  "- Esas ubicaciones son datos REALES declarados directamente por el dueño de la cuenta en su Configuracion, NO son evidencia de Search Console/GA4/Bing y NO necesitan aparecer en ninguna consulta para poder usarse — a diferencia de cualquier otra ciudad, pais o perfil, que si necesitan evidencia real.",
  "- Combina una UBICACION DE CLIENTE (de donde es/vive el cliente real) con una UBICACION DEL NEGOCIO (donde opera/vende el negocio) para crear titulos ultra segmentados del tipo 'Como [accion] en [ubicacion del negocio] si vivo en [ubicacion del cliente]' — siempre que el TEMA en si (ej. seguros, propiedades, inversion) tenga evidencia real de que es relevante para esta cuenta.",
  "- No inventes una combinacion nueva de cliente+negocio que no este en las listas declaradas; usa unicamente las ubicaciones exactas que aparecen en UBICACIONES DE CLIENTES y UBICACIONES DEL NEGOCIO mas abajo.",
  "- Esto es ADICIONAL a la regla de cero canibalizacion: cada combinacion cliente+negocio distinta cuenta como una necesidad realmente distinta (perfil geografico distinto), no como el mismo titulo repetido.",
  "",
  "REGLAS OBLIGATORIAS:",
  "- Cubre TODAS las categorias de CATEGORIAS PERMITIDAS que tengan evidencia real de oportunidad en este lote de datos. NO te limites a un numero fijo de categorias: si hay evidencia real para 15 o 25 categorias distintas, devuelve las 15 o 25.",
  "- Devuelve tantos titulos long tail unicos y no canibalizados por categoria como la evidencia real sostenga. No existe una cantidad fija por categoria: deja que la evidencia, la creatividad y el limite natural de la respuesta determinen cuantas oportunidades son validas.",
  "- SE SOSPECHOSAMENTE POCO CONSERVADOR cuando la evidencia es abundante: si este lote trae docenas de consultas reales distintas, un resultado de 1 o 2 categorias es casi siempre una señal de que te quedaste corto, no de que falte evidencia — revisa de nuevo cada consulta del lote, una por una, antes de decidir que no hay mas oportunidades. Una consulta con pocas impresiones sigue siendo evidencia real valida; no exijas volumen alto para animarte a proponer un titulo.",
  "- Cada titulo debe tener una justificacion basada en datos reales que nombre la intencion de busqueda distinta que cubre",
  "- No inventes años, nacionalidades, ciudades, precios, estadísticas ni perfiles. Un modificador solo puede aparecer en un titulo si está respaldado por una consulta, página o señal real entregada.",
  "- Si la consulta o rama no encaja claramente en la categoria asignada, descártala; nunca la coloques en la categoria más parecida por una palabra compartida.",
  "- CERO canibalizacion, ni dentro del mismo grupo ni contra TITULOS YA EXISTENTES ni contra OPORTUNIDADES YA CREADAS EN ESTA CORRIDA (ver REGLA OBLIGATORIA DE CERO CANIBALIZACION)",
  "- Usa unicamente categoryId existentes en la lista permitida",
  "- impressions y clicks del grupo deben ser representativos de la evidencia usada",
  "",
  "FORMATO DE RESPUESTA:",
  "Responde SOLO con JSON valido (sin markdown, sin texto adicional):",
  '{"opportunities":[{"categoryId":"id","rationale":"analisis de oportunidad basado en datos","impressions":123,"clicks":4,"titles":[{"text":"titulo long tail inteligente","needKey":"objeto_contexto_perfil_ubicacion","rationale":"justificacion con datos reales que respalda esta oportunidad"}]}]}',
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
  // Ubicaciones REALES declaradas por el dueño de la cuenta en Configuración
  // (Configuración → Cuenta), no inventadas ni deducidas de evidencia —
  // pedido explícito de Milton, 7/9/2026. Vacío en cuentas que no lo llenen,
  // sin cambio de comportamiento.
  clientLocations?: string[];
  businessLocations?: string[];
}): Promise<OpportunityAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no esta configurada.");

  // Bajado de 250 a 100 (7/9/2026, pedido de Milton: al menos 10 títulos por
  // corrida cuando hay evidencia real, como confirmó el diagnóstico de
  // producción con 262 consultas distintas disponibles). Con 250, una cuenta
  // con ~450 filas de Search Console solo generaba 2 lotes — 2 oportunidades
  // reales de que el modelo cubriera 10 categorías distintas. Con 100 filas
  // por lote, la misma evidencia produce más pasadas (más llamadas a OpenAI,
  // mismo techo de MAX_BATCHES), dando más intentos de cubrir categorías que
  // quedaron sin título en un lote anterior — sin bajar el listón de
  // evidencia real exigido a cada título.
  const BATCH_SIZE = 100;
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
  const evidenceRows = [
    ...input.currentRows,
    ...input.previousRows,
    ...input.countryRows,
  ];

  // Garantía determinista contra categoría↔título mal asignados (7/9/2026 y
  // 8/9/2026, hallazgo real confirmado en producción: un título sin ninguna
  // mención de "deducible" cayó en la categoría "Deducibles", y uno sin
  // mención de embarazo/bebé cayó en "Embarazo y Bebés"). El modelo puede
  // asignar mal aunque se le den ejemplos, así que se valida en código: cada
  // categoría tiene un "vocabulario distintivo" (palabras de su nombre y de
  // sus ejemplos ya publicados que NO son genéricas — es decir, que no se
  // repiten en casi todas las demás categorías de la cuenta, como "seguros",
  // "salud" o "florida" en una cuenta de seguros de salud en Florida). Un
  // título nuevo debe compartir la raíz de al menos una palabra de ese
  // vocabulario con la categoría a la que el modelo lo asignó; si no
  // comparte nada, se descarta (no se reasigna a ciegas — mejor perder un
  // título que publicarlo en el lugar equivocado). Si una categoría no tiene
  // vocabulario distintivo (nombre y ejemplos 100% genéricos), no se puede
  // juzgar y no se bloquea nada — evita falsos rechazos en cuentas con
  // categorías de nombres muy parecidos entre sí.
  // "seleccion" y "problema" son cubetas canónicas MUY amplias (agrupan
  // elegir/mejor/mejores/opciones y errores/error/problemas/soluciones,
  // ver stemIntentToken) — sirven para detectar canibalización, pero como
  // vocabulario de categoría son ruido puro: casi cualquier categoría tiene
  // un ejemplo con "mejores X" o "errores comunes", así que dejarlas pasar
  // aquí volvía a aceptar títulos genéricos sin relación real con el tema.
  const CATEGORY_VOCAB_NOISE = new Set(["seleccion", "problema"]);
  const categoryVocabTokens = (value: string): Set<string> => {
    const tokens = intentTokens(value);
    for (const noise of CATEGORY_VOCAB_NOISE) tokens.delete(noise);
    return tokens;
  };
  const nameTokensByCategory = new Map<string, Set<string>>();
  const exampleTokensByCategory = new Map<string, Set<string>>();
  for (const category of input.categories) {
    nameTokensByCategory.set(category.id, categoryVocabTokens(category.name));
    const exampleTokens = new Set<string>();
    for (const example of category.publishedExamples ?? []) {
      for (const token of categoryVocabTokens(example)) exampleTokens.add(token);
    }
    exampleTokensByCategory.set(category.id, exampleTokens);
  }
  const categoryCount = input.categories.length;
  const countCategoriesWithToken = (map: Map<string, Set<string>>, token: string) => {
    let count = 0;
    for (const tokens of map.values()) if (tokens.has(token)) count++;
    return count;
  };
  const isGenericAcrossCategories = (map: Map<string, Set<string>>, token: string) =>
    categoryCount > 1 && countCategoriesWithToken(map, token) > categoryCount / 2;
  const distinctiveVocabularyByCategory = new Map<string, Set<string>>();
  for (const category of input.categories) {
    const distinctive = new Set<string>();
    for (const token of nameTokensByCategory.get(category.id) ?? []) {
      if (!isGenericAcrossCategories(nameTokensByCategory, token)) distinctive.add(token);
    }
    for (const token of exampleTokensByCategory.get(category.id) ?? []) {
      if (!isGenericAcrossCategories(exampleTokensByCategory, token)) distinctive.add(token);
    }
    distinctiveVocabularyByCategory.set(category.id, distinctive);
  }
  const titleFitsCategory = (text: string, categoryId: string): boolean => {
    const distinctive = distinctiveVocabularyByCategory.get(categoryId);
    if (!distinctive || distinctive.size === 0) return true;
    return tokensShareRoot(categoryVocabTokens(text), distinctive);
  };

  // needKey por título, guardado aparte de OpportunityAnalysisGroup (que solo
  // persiste text/rationale en la base) para poder mostrarlo en el prompt de
  // los siguientes lotes y para el chequeo cruzado de intención.
  const needKeyByTitle = new Map<string, string>();

  // Firmas de intención GLOBALES a TODA LA CORRIDA (no por categoría), pero
  // SOLO de lo generado ahora — nunca de lo ya publicado. Corrección
  // encontrada en producción (7/9/2026, cuenta de Lorena Álvarez): una
  // primera versión de esto arrancaba también con `input.existingTitles`,
  // comparándolos por similitud de palabras contra cada título nuevo. En una
  // cuenta con 405 artículos ya publicados y muy temática (todo "seguros de
  // salud en Florida"), casi cualquier título nuevo comparte 3+ palabras con
  // ALGO ya publicado, así que terminaba bloqueando de más — de ~14-19
  // oportunidades típicas bajó a solo 2. Esto además contradecía una decisión
  // de diseño ya tomada antes (ver "Decisión de diseño explicada" en
  // COORDINACION_CLAUDE_CODEX.md): la similitud de texto contra lo publicado
  // NUNCA debe ser un filtro de código, porque dos títulos long tail
  // legítimos (misma ciudad/tema, ángulo distinto) comparten casi todas las
  // palabras sin ser canibalización real. Lo ya publicado sigue protegido
  // solo por coincidencia EXACTA de texto (`seen`, sin cambios). Esta firma
  // global solo cierra el hueco real reportado por Codex: dos títulos casi
  // idénticos podían colarse si el modelo los repartía en categorías
  // distintas DENTRO DE LA MISMA CORRIDA (p.ej. "Inmigración" y "Seguros de
  // salud"), porque antes solo se comparaba dentro de la misma categoría.
  const intentSignatures: IntentSignature[] = [];

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
        titles: (groupsByCategory.get(category.id)?.titles ?? []).map((t) => ({
          text: t.text,
          needKey: needKeyByTitle.get(t.text) ?? null,
        })),
      }))
      .filter((entry) => entry.titles.length > 0);

    const currentYear = new Date().getUTCFullYear();
    const prompt = `${PROMPT_HEADER}

NO HAY TOPE FIJO DE TITULOS POR CATEGORIA: devuelve todas las oportunidades que la evidencia real sostenga, sin repetir intención. La cantidad no es un objetivo: si solo existe una rama distinta, devuelve una; si existen muchas ramas respaldadas, devuélvelas todas.

REGLA OBLIGATORIA DE AÑOS RECIENTES (ESTRICTA, sin excepciones): el año de hoy es ${currentYear}. Si un titulo incluye un año, ese año DEBE estar entre ${currentYear - 1} y ${currentYear + 1}. PROHIBIDO usar un año anterior a ${currentYear - 1} (ej. "${currentYear - 3}", "${currentYear - 2}") aunque aparezca literalmente en una consulta o pagina de la evidencia — una consulta vieja que Search Console todavia muestra con impresiones NO autoriza a publicar hoy un titulo con ese año desactualizado.

CATEGORIAS PERMITIDAS (con EJEMPLOS DE TITULOS YA PUBLICADOS por categoria):
${JSON.stringify(input.categories)}

DISTRIBUCION GEOGRAFICA REAL POR PAIS:
${JSON.stringify(topCountries)}

UBICACIONES DE CLIENTES (declaradas por el dueño de la cuenta, de donde son sus clientes reales — usar tal cual, ver REGLA OBLIGATORIA DE GEOLOCALIZACION arriba):
${JSON.stringify(input.clientLocations ?? [])}

UBICACIONES DEL NEGOCIO (declaradas por el dueño de la cuenta, donde opera/vende el negocio — usar tal cual, ver REGLA OBLIGATORIA DE GEOLOCALIZACION arriba):
${JSON.stringify(input.businessLocations ?? [])}

SEÑALES OPCIONALES DE GOOGLE ANALYTICS 4:
${JSON.stringify(input.googleAnalyticsSummary ?? { connected: false })}

SEÑALES OPCIONALES DE BING WEBMASTER TOOLS:
${JSON.stringify(input.bingSummary ?? { connected: false })}

RENDIMIENTO ACTUAL Y COMPARACION (lote ${batchIndex + 1} de ${batchesToProcess.length}):
${JSON.stringify(batch)}

TITULOS YA EXISTENTES (publicados, en toda la cuenta):
${JSON.stringify(input.existingTitles)}

OPORTUNIDADES YA CREADAS EN ESTA CORRIDA, POR CATEGORIA, CON SU needKey (NO CANIBALIZAR NI REPETIR needKey, NI DENTRO DE LA MISMA CATEGORIA NI CONTRA OTRA CATEGORIA DISTINTA):
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
    applyOpportunityItems(opportunities);
  }

  // PASO DEDICADO DE GEOLOCALIZACION (7/9/2026, pedido explicito de Milton:
  // "haz lo necesario para que la ejecucion vaya en funcion de los
  // objetivos... no quiero tantas pruebas"). Confirmado en produccion que
  // meter la regla de geolocalizacion como una linea mas del prompt
  // principal NO bastaba: el modelo la ignoraba casi siempre porque tenia
  // que competir contra otras ~15 reglas obligatorias en la misma llamada.
  // Solucion determinista: una llamada A PARTE, con un prompt corto y
  // enfocado EXCLUSIVAMENTE en combinar cliente x negocio, sin ninguna otra
  // regla que le reste prioridad. Solo corre cuando el dueño de la cuenta
  // declaro AMBAS listas; en cualquier otro caso el comportamiento es
  // identico a antes (cero llamadas nuevas, cero cambio).
  if ((input.clientLocations?.length ?? 0) > 0 && (input.businessLocations?.length ?? 0) > 0) {
    const combos = input.clientLocations!.flatMap((client) =>
      input.businessLocations!.map((business) => ({ client, business })),
    );
    const geoPrompt = `Eres un estratega SEO. Tu UNICA tarea ahora es crear titulos long tail que combinen explicitamente una ubicacion de CLIENTE con una ubicacion de NEGOCIO, una por titulo, usando EXACTAMENTE las combinaciones de la lista de abajo (no inventes otras).

Formato esperado del titulo: una frase natural que mencione la accion (comprar, invertir, elegir, contratar, etc.), el tema real del negocio (segun las categorias de abajo) y AMBAS ubicaciones — la de negocio como destino/lugar del servicio, la de cliente como "si vivo en..." / "siendo de...". Ejemplo: "Como invertir en propiedades en Homestead si vivo en Colombia".

COMBINACIONES OBLIGATORIAS A CUBRIR (una por una, en el orden dado; si una combinacion no tiene sentido real para el negocio, omitela y sigue con la siguiente):
${JSON.stringify(combos)}

CATEGORIAS PERMITIDAS (con EJEMPLOS DE TITULOS YA PUBLICADOS por categoria — el tema del titulo debe encajar en una de estas, igual que cualquier otro titulo del sistema):
${JSON.stringify(input.categories)}

TITULOS YA EXISTENTES (publicados, en toda la cuenta) — no repitas la misma pregunta principal que alguno de estos:
${JSON.stringify(input.existingTitles)}

Reglas no negociables (las mismas que rigen todo el sistema, resumidas):
- Cada titulo debe ir en un categoryId real de la lista de arriba; si ninguna categoria encaja con el tema real del negocio, omite esa combinacion.
- No inventes anos, cifras ni datos que no esten en las categorias o en esta instruccion.
- Cada titulo debe declarar "needKey" (objeto_contexto_perfil_ubicacion en snake_case, sin verbo ni formato) que incluya AMBAS ubicaciones para que el sistema lo distinga de otros titulos.
- Puedes proponer mas de un titulo por combinacion solo si son necesidades realmente distintas (ver needKey); si no, uno solo por combinacion alcanza.

Responde SOLO con JSON valido (sin markdown): {"opportunities":[{"categoryId":"id","rationale":"por que esta combinacion tiene sentido para este negocio","impressions":0,"clicks":0,"titles":[{"text":"...","needKey":"...","rationale":"..."}]}]}
Si genuinamente ninguna combinacion tiene sentido real para este negocio, responde: {"opportunities":[]}`;

    try {
      const parsedGeo = await callOpenAiWithRetry(geoPrompt, apiKey);
      const geoOpportunities = parsedGeo.opportunities;
      if (Array.isArray(geoOpportunities)) applyOpportunityItems(geoOpportunities);
    } catch (err) {
      console.error("Paso dedicado de geolocalizacion fallo (no bloquea el resto del analisis):", err);
    }
  }

  if (allResult.length === 0) {
    return { status: "no_new" };
  }
  return { status: "ok", groups: allResult };

  // Palabras clave de temas excluidos, parseadas desde input.excludedTopics
  const excludedKeywords = new Set<string>();
  if (input.excludedTopics && input.excludedTopics.trim()) {
    input.excludedTopics
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)
      .forEach((topic) => {
        // Agregar el topic completo y sus palabras individuales para búsqueda flexible
        excludedKeywords.add(topic);
        topic.split(/\s+/).forEach((word) => {
          if (word.length > 2) excludedKeywords.add(word);
        });
      });
  }

  // Verifica si un título toca temas excluidos. Comparación laxa: si alguna
  // palabra del título (3+ caracteres) coincide con keyword excluida, rechaza.
  function titleTouchesExcludedTopic(text: string): boolean {
    if (excludedKeywords.size === 0) return false;
    const textNormalized = normalizeTitle(text);
    const titleWords = textNormalized.split(/\s+/).filter((w) => w.length > 2);
    return titleWords.some((word) => excludedKeywords.has(word));
  }

  // Procesa un array crudo de "opportunities" devuelto por OpenAI (del lote
  // principal o del paso dedicado de geolocalizacion) con exactamente las
  // mismas validaciones deterministas: categoria valida, texto no vacio y no
  // duplicado exacto, anio real y reciente, y sin colision de needKey/
  // intencion contra nada ya aceptado en esta corrida. Factor comun para que
  // ambas fuentes respeten las mismas garantias, sin duplicar la logica.
  function applyOpportunityItems(opportunities: unknown[]) {
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
        // Garantía determinista contra temas excluidos: si el usuario indicó
        // que no quiere ciertos temas, rechazar CUALQUIER título que los mencione,
        // sin importar cuán buena sea la evidencia. Esta validación corre AQUÍ
        // (en JavaScript), no solo en el prompt, para garantizar cumplimiento.
        if (titleTouchesExcludedTopic(text)) continue;
        // Garantía determinista contra años inventados O desactualizados:
        // cada año en el título debe tener evidencia real Y estar dentro de
        // la ventana de recencia aceptable (año actual ±1), sin excepción.
        if (
          extractYears(text).some(
            (year) =>
              !isYearAcceptablyRecent(year) ||
              !hasContextualEvidenceForYear(text, year, evidenceRows),
          )
        ) continue;
        // Garantía determinista contra categoría↔título mal asignados: el
        // título debe compartir al menos una raíz de palabra con el
        // vocabulario distintivo de la categoría a la que el modelo lo
        // asignó (ver cálculo de distinctiveVocabularyByCategory arriba).
        if (!titleFitsCategory(text, group.categoryId)) continue;
        const needKey = typeof value.needKey === "string" ? value.needKey.trim() : undefined;
        const signature = buildIntentSignature(text, needKey);
        // Chequeo GLOBAL a esta corrida (cualquier categoría, no solo la
        // actual) — cierra el hueco real de canibalización cruzada entre
        // categorías. NO compara contra lo ya publicado (ver nota arriba,
        // en la inicialización de intentSignatures).
        if (collidesWithIntent(signature, intentSignatures)) continue;
        seen.add(normalized);
        intentSignatures.push(signature);
        if (needKey) needKeyByTitle.set(text, needKey);
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
}
