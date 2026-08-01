import type { GoogleSearchAnalyticsRow } from "@auto-articulos/shared";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

interface OpportunityAnalysisGroup {
  categoryId: string;
  rationale: string;
  impressions: number;
  clicks: number;
  titles: Array<{ text: string; rationale: string }>;
}

function normalizeTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractJsonArray(text: string) {
  return text.match(/\[[\s\S]*\]/)?.[0] ?? null;
}

export async function analyzeSeoOpportunities(input: {
  categories: Array<{ id: string; name: string }>;
  currentRows: GoogleSearchAnalyticsRow[];
  previousRows: GoogleSearchAnalyticsRow[];
  existingTitles: string[];
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no está configurada.");

  const previous = new Map(
    input.previousRows.map((row) => [row.keys.join("\u0000"), row]),
  );
  const performance = input.currentRows
    .map((row) => {
      const old = previous.get(row.keys.join("\u0000"));
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

  const prompt = `Actúa como analista senior de Google Search Console y estratega SEO en español. Debes crear clusters long tail que amplíen lo que ya funciona y produzcan un efecto de bola de nieve, sin repetir títulos ni provocar canibalización.

REGLAS OBLIGATORIAS:
- Selecciona como máximo 10 categorías de la lista permitida. Si hay más, prioriza las respaldadas por mayores impresiones y tendencia positiva.
- Devuelve EXACTAMENTE 9 títulos por categoría elegida.
- Cada título debe responder a una intención long tail distinta, ser específico y estar relacionado con evidencia de Search Console.
- No repitas, reformules de manera casi idéntica ni compitas con ningún título existente ni con otra propuesta.
- Usa únicamente categoryId existentes en la lista permitida.
- No inventes estadísticas. impressions y clicks del grupo deben ser la suma aproximada de la evidencia que usaste.
- Responde SOLO con un array JSON, sin markdown, con esta forma:
[{"categoryId":"id","rationale":"explicación breve basada en datos","impressions":123,"clicks":4,"titles":[{"text":"título","rationale":"oportunidad/intención"}]}]

CATEGORÍAS PERMITIDAS:
${JSON.stringify(input.categories)}

RENDIMIENTO ACTUAL Y COMPARACIÓN (consulta, página, métricas):
${JSON.stringify(performance)}

TÍTULOS YA EXISTENTES (prohibido repetir o canibalizar):
${JSON.stringify(input.existingTitles.slice(0, 800))}`;

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
  const raw = data.choices?.[0]?.message?.content ?? "";
  const json = extractJsonArray(raw);
  if (!json) throw new Error("El análisis no devolvió categorías válidas.");
  const parsed = JSON.parse(json) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Formato de análisis inválido.");

  const validCategoryIds = new Set(input.categories.map((item) => item.id));
  const selectedCategoryIds = new Set<string>();
  const seen = new Set(input.existingTitles.map(normalizeTitle));
  const result: OpportunityAnalysisGroup[] = [];
  for (const item of parsed.slice(0, 10)) {
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
    if (titles.length !== 9) continue;
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
    throw new Error(
      "El análisis no produjo grupos completos de 9 títulos únicos. Intenta nuevamente.",
    );
  }
  return result;
}
