import { prisma } from "@auto-articulos/db";
import { hasTrialAccess } from "@/lib/trial";
import { getTitleGenerationPrompt } from "@/lib/title-generation-prompt";
import {
  MAX_REQUESTS_PER_DAY,
  MAX_TITLES,
  buildAvoidSet,
  buildMessages,
  dayKeyFor,
  normalizeTitle,
  parseModelOutput,
  pickAvoidForPrompt,
  remainingRequests,
  selectValidTitles,
  type AvoidCandidate,
  type TitleGenerationInputs,
} from "@/lib/title-generation-core";

// CREACION DE PUBLICACIONES PROPIAS — orquestación de la generación de títulos
// con la IA del sistema: cupo atómico de 3 solicitudes por día, llamada a
// OpenAI, filtro de repetidos y registro. La lógica pura (y sus pruebas) vive
// en title-generation-core.ts.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
// Mismo modelo que usa Oportunidades. Se valida en local con el prompt real
// antes de fijarlo; no se baja de modelo sin aprobación de Milton.
const OPENAI_MODEL = "gpt-4o-mini";
const OPENAI_TIMEOUT_MS = 40_000;
// Máximo de llamadas a la IA por solicitud: la primera y un único reintento.
const MAX_AI_CALLS = 2;
// Tope de seguridad de títulos previos que se comparan en código.
const MAX_AVOID_FROM_TITLES = 5000;
const MAX_AVOID_FROM_REQUESTS = 1000;
const INPUT_RETENTION_DAYS = 90;
const PLATFORM = "10minutesWebsite";

const DEFAULT_LANGUAGE_NAMES: Record<string, string> = {
  es: "Español",
  en: "Inglés",
  pt: "Portugués",
  fr: "Francés",
  it: "Italiano",
  de: "Alemán",
};

export class TitleGenerationError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TitleGenerationError";
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

export interface TitleGenerationStatus {
  /** true = el administrador ya configuró el prompt y hay clave de IA. */
  enabled: boolean;
  used: number;
  remaining: number;
  max: number;
}

export async function getTitleGenerationStatus(userId: string): Promise<TitleGenerationStatus> {
  const [prompt, used] = await Promise.all([
    getTitleGenerationPrompt(),
    prisma.titleGenerationRequest.count({ where: { userId, dayKey: dayKeyFor(new Date()) } }),
  ]);
  return {
    enabled: Boolean(prompt) && Boolean(process.env.OPENAI_API_KEY),
    used,
    remaining: remainingRequests(used),
    max: MAX_REQUESTS_PER_DAY,
  };
}

/**
 * Cupo de publicación disponible: mismo cálculo y misma convención de "hoy" y
 * "mes" que POST /api/runs (mínimo entre lote, diario y mensual).
 */
async function getPublishQuota(
  userId: string,
  user: { maxTitlesPerBatch: number; dailyArticleLimit: number | null; monthlyArticleLimit: number | null },
): Promise<number> {
  const available = [user.maxTitlesPerBatch];
  if (user.monthlyArticleLimit !== null) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const published = await prisma.title.count({
      where: { status: "success", processedAt: { gte: startOfMonth }, run: { userId } },
    });
    available.push(user.monthlyArticleLimit - published);
  }
  if (user.dailyArticleLimit !== null) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const published = await prisma.title.count({
      where: { status: "success", processedAt: { gte: startOfDay }, run: { userId } },
    });
    available.push(user.dailyArticleLimit - published);
  }
  return Math.min(...available);
}

async function resolveLanguageLabel(userId: string, value: string): Promise<string> {
  const row = await prisma.language.findUnique({
    where: { userId_platform_externalId: { userId, platform: PLATFORM, externalId: value } },
    select: { name: true },
  });
  return row?.name ?? DEFAULT_LANGUAGE_NAMES[value] ?? value;
}

/** Retención: a los 90 días se borra lo que el usuario escribió; los títulos ofrecidos se conservan. */
async function purgeOldInputs(): Promise<void> {
  const cutoff = new Date(Date.now() - INPUT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.$executeRaw`UPDATE "TitleGenerationRequest" SET "inputs" = NULL WHERE "createdAt" < ${cutoff} AND "inputs" IS NOT NULL`;
}

/**
 * Toma la primera solicitud libre del día (1..3). El @@unique
 * (userId, dayKey, slot) hace que dos pestañas simultáneas no puedan tomar la
 * misma: la perdedora recibe P2002 y prueba la siguiente.
 */
async function claimSlot(data: {
  userId: string;
  dayKey: string;
  categoryId: string;
  categoryName: string;
  inputs: TitleGenerationInputs;
}): Promise<string | null> {
  const { inputs, ...rest } = data;
  for (let slot = 1; slot <= MAX_REQUESTS_PER_DAY; slot++) {
    try {
      const row = await prisma.titleGenerationRequest.create({
        // Objeto plano: Prisma no acepta una interface como valor JSON.
        data: { ...rest, inputs: { ...inputs }, slot, offeredTitles: [] },
        select: { id: true },
      });
      return row.id;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  return null;
}

async function loadAvoid(userId: string, categoryId: string): Promise<{ all: string[]; items: AvoidCandidate[] }> {
  const [requests, titles] = await Promise.all([
    prisma.titleGenerationRequest.findMany({
      where: { userId },
      select: { categoryId: true, offeredTitles: true },
      orderBy: { createdAt: "desc" },
      take: MAX_AVOID_FROM_REQUESTS,
    }),
    prisma.title.findMany({
      where: { run: { userId } },
      select: { text: true, finalTitle: true, run: { select: { categoryId: true } } },
      orderBy: { run: { createdAt: "desc" } },
      take: MAX_AVOID_FROM_TITLES,
    }),
  ]);

  const all: string[] = [];
  const items: AvoidCandidate[] = [];
  for (const request of requests) {
    for (const title of request.offeredTitles) {
      all.push(title);
      items.push({ title, sameCategory: request.categoryId === categoryId });
    }
  }
  for (const row of titles) {
    const sameCategory = row.run.categoryId === categoryId;
    all.push(row.text);
    items.push({ title: row.text, sameCategory });
    if (row.finalTitle && row.finalTitle !== row.text) all.push(row.finalTitle);
  }
  return { all, items };
}

async function callOpenAi(system: string, user: string, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    if (!response.ok) {
      // El detalle va al log del servidor; al usuario nunca se le muestra.
      console.error("[title-generation] OpenAI respondió", response.status, data.error?.message ?? "");
      throw new Error(`OpenAI ${response.status}`);
    }
    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}

export interface GenerateParams {
  userId: string;
  categoryId: string;
  languageValue: string;
  inputs: TitleGenerationInputs;
}

export interface GenerateResult {
  requestId: string;
  titles: string[];
  /** Menos de 9 títulos válidos (nunca se rellenan con títulos inventados). */
  partial: boolean;
  requestsRemaining: number;
}

export async function generateTitlesForUser(params: GenerateParams): Promise<GenerateResult> {
  const { userId, inputs } = params;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      role: true,
      isTrialSignup: true,
      trialStartedAt: true,
      trialUnlocked: true,
      maxTitlesPerBatch: true,
      monthlyArticleLimit: true,
      dailyArticleLimit: true,
      contentLanguage: true,
    },
  });

  // Mismas barreras que POST /api/runs, ANTES de gastar una solicitud de IA.
  if (!hasTrialAccess(user)) {
    throw new TitleGenerationError(
      403,
      "TRIAL_EXPIRED",
      "Tu período de prueba gratuita ha finalizado. Contacta al administrador para desbloquear tu cuenta.",
    );
  }
  const languageValue = params.languageValue.trim() || user.contentLanguage?.trim() || "";
  if (!languageValue) {
    throw new TitleGenerationError(
      400,
      "NO_LANGUAGE",
      "Debes configurar tu idioma de redacción en Configuración antes de crear títulos.",
    );
  }

  const category = await prisma.category.findFirst({
    where: { id: params.categoryId, userId, platform: PLATFORM, source: { not: "archived" } },
    select: { id: true, name: true },
  });
  if (!category) {
    throw new TitleGenerationError(400, "NO_CATEGORY", "Elige una de tus categorías sincronizadas.");
  }

  // D5: sin cupo de publicación no hay nada que se pueda marcar; no se gasta IA.
  const quota = await getPublishQuota(userId, user);
  if (quota <= 0) {
    throw new TitleGenerationError(
      409,
      "NO_QUOTA",
      "Tu cupo de publicación disponible es de 0 artículos, así que no podrías usar los títulos. Vuelve cuando se renueve tu cupo.",
    );
  }

  const adminPrompt = await getTitleGenerationPrompt();
  if (!adminPrompt) {
    throw new TitleGenerationError(409, "PROMPT_NOT_CONFIGURED", "Esta función aún no está disponible.");
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[title-generation] OPENAI_API_KEY no está configurada.");
    throw new TitleGenerationError(503, "AI_NOT_CONFIGURED", "Esta función aún no está disponible.");
  }

  const languageLabel = await resolveLanguageLabel(userId, languageValue);

  // Limpieza perezosa de retención; un fallo aquí nunca bloquea la solicitud.
  await purgeOldInputs().catch((error) => console.error("[title-generation] purga falló", error));

  const requestId = await claimSlot({
    userId,
    dayKey: dayKeyFor(new Date()),
    categoryId: category.id,
    categoryName: category.name,
    inputs,
  });
  if (!requestId) {
    throw new TitleGenerationError(
      429,
      "DAILY_LIMIT",
      `Ya hiciste tus ${MAX_REQUESTS_PER_DAY} solicitudes de hoy. Vuelve mañana.`,
    );
  }

  let finalized = false;
  try {
    const avoid = await loadAvoid(userId, category.id);
    const avoidSet = buildAvoidSet(avoid.all);
    const promptAvoid = pickAvoidForPrompt(avoid.items);

    const accepted: string[] = [];
    for (let call = 1; call <= MAX_AI_CALLS && accepted.length < MAX_TITLES; call++) {
      const missing = MAX_TITLES - accepted.length;
      const { system, user: userMessage } = buildMessages(adminPrompt, {
        categoryName: category.name,
        languageLabel,
        inputs,
        titlesToAvoid: [...accepted, ...promptAvoid],
        count: missing,
      });

      let raw: string;
      try {
        raw = await callOpenAi(system, userMessage, apiKey);
      } catch (error) {
        if (call === MAX_AI_CALLS) break;
        console.error("[title-generation] falló la llamada, se reintenta una vez", error);
        continue;
      }

      const candidates = parseModelOutput(raw);
      if (!candidates) continue;
      const { titles } = selectValidTitles(candidates, avoidSet, missing);
      for (const title of titles) {
        avoidSet.add(normalizeTitle(title));
        accepted.push(title);
      }
    }

    if (accepted.length === 0) {
      throw new TitleGenerationError(
        502,
        "NO_VALID_TITLES",
        "La IA no pudo generar títulos nuevos esta vez. No se descontó ninguna solicitud. Prueba cambiando el tema o el tipo de cliente.",
      );
    }

    await prisma.titleGenerationRequest.update({
      where: { id: requestId },
      data: { offeredTitles: accepted },
    });
    finalized = true;

    const used = await prisma.titleGenerationRequest.count({
      where: { userId, dayKey: dayKeyFor(new Date()) },
    });
    return {
      requestId,
      titles: accepted,
      partial: accepted.length < MAX_TITLES,
      requestsRemaining: remainingRequests(used),
    };
  } finally {
    // Si algo falló, la solicitud no se consume: se libera el cupo del día.
    if (!finalized) {
      await prisma.titleGenerationRequest
        .delete({ where: { id: requestId } })
        .catch((error) => console.error("[title-generation] no se pudo liberar el cupo", error));
    }
  }
}
