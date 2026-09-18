import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

// CREACION DE PUBLICACIONES PROPIAS — prueba de INTEGRACIÓN contra una base de
// datos real, con la IA simulada (no se llama a OpenAI ni se gasta nada).
//
// Solo corre si se define TITLE_GENERATION_TEST_DATABASE_URL y esa base se
// llama "*_test". Con cualquier otra base se niega a ejecutarse: nunca debe
// apuntar a la base compartida ni a producción. Por defecto `npm test` la omite.
//
//   TITLE_GENERATION_TEST_DATABASE_URL=postgresql://.../autoarticulos_cpp_test npm test

const testUrl = process.env.TITLE_GENERATION_TEST_DATABASE_URL;
const dbName = testUrl ? decodeURIComponent(new URL(testUrl).pathname.replace(/^\//, "")) : "";
const enabled = Boolean(testUrl) && dbName.endsWith("_test");
if (testUrl && !enabled) {
  throw new Error(`Por seguridad esta prueba solo corre contra una base cuyo nombre termine en "_test" (recibí "${dbName}").`);
}

type Db = typeof import("@auto-articulos/db");
type Lib = typeof import("./title-generation");
type PromptLib = typeof import("./title-generation-prompt");

interface FetchCall {
  url: string;
  authorization: string;
  body: { model: string; messages: { role: string; content: string }[]; response_format?: unknown };
}
type Reply = { status: number; json: unknown };

const SECRET_MARKER = "PROMPT_SECRETO_DE_MILTON";
const inputs = {
  clienteTipo: "colombianos que viven en Colombia",
  tema: "propiedades en Homestead",
  deseoCliente: "invertir en Estados Unidos con poco capital",
  ubicacionClientes: "Colombia, Bogotá",
  ubicacionNegocio: "Miami, Homestead",
};

const ok = (titles: string[]): Reply => ({
  status: 200,
  json: { choices: [{ message: { content: JSON.stringify({ titles }) } }] },
});
const mk = (prefix: string, n: number, start = 1): string[] =>
  Array.from({ length: n }, (_, i) => `${prefix} guía ${start + i} para invertir en propiedades de Homestead`);

describe("generateTitlesForUser (integración)", { skip: enabled ? false : "definir TITLE_GENERATION_TEST_DATABASE_URL (base *_test)" }, () => {
  let db: Db;
  let lib: Lib;
  let promptLib: PromptLib;
  const createdUsers: string[] = [];
  const calls: FetchCall[] = [];
  let responder: (call: FetchCall, n: number) => Reply = () => ok([]);
  const realFetch = globalThis.fetch;

  before(async () => {
    process.env.DATABASE_URL = testUrl;
    process.env.DIRECT_URL = testUrl;
    process.env.CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    process.env.OPENAI_API_KEY = "test-key-no-real";
    db = await import("@auto-articulos/db");
    lib = await import("./title-generation");
    promptLib = await import("./title-generation-prompt");

    globalThis.fetch = (async (url: unknown, init?: { body?: string; headers?: Record<string, string> }) => {
      const call: FetchCall = {
        url: String(url),
        authorization: init?.headers?.Authorization ?? "",
        body: JSON.parse(init?.body ?? "{}"),
      };
      calls.push(call);
      const reply = responder(call, calls.length);
      return new Response(JSON.stringify(reply.json), { status: reply.status, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;

    await promptLib.setTitleGenerationPrompt(`${SECRET_MARKER}. Crea títulos sobre {{tema}} para {{cliente_tipo}} en {{idioma}}.`);
  });

  after(async () => {
    globalThis.fetch = realFetch;
    if (db) {
      await db.prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
      await db.prisma.systemSetting.deleteMany({ where: { key: promptLib.TITLE_GENERATION_PROMPT_KEY } });
      await db.prisma.$disconnect();
    }
  });

  async function makeUser(overrides: Record<string, unknown> = {}) {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const user = await db.prisma.user.create({
      data: { email: `tg-${stamp}@test.local`, passwordHash: "x", contentLanguage: "es", ...overrides },
    });
    createdUsers.push(user.id);
    const category = await db.prisma.category.create({
      data: { userId: user.id, platform: "10minutesWebsite", externalId: "cat-1", name: "Inversión" },
    });
    return { userId: user.id, categoryId: category.id };
  }

  const params = (u: { userId: string; categoryId: string }) => ({
    userId: u.userId,
    categoryId: u.categoryId,
    languageValue: "es",
    inputs,
  });

  const rowsFor = (userId: string) => db.prisma.titleGenerationRequest.findMany({ where: { userId }, orderBy: { slot: "asc" } });

  it("camino feliz: 9 títulos, fila guardada, cupo descontado y llamada correcta a la IA", async () => {
    const u = await makeUser();
    calls.length = 0;
    responder = () => ok(mk("Alfa", 9));
    const result = await lib.generateTitlesForUser(params(u));

    assert.equal(result.titles.length, 9);
    assert.equal(result.partial, false);
    assert.equal(result.requestsRemaining, 2);
    assert.equal(calls.length, 1);

    const call = calls[0];
    assert.match(call.url, /api\.openai\.com/);
    assert.equal(call.authorization, "Bearer test-key-no-real");
    assert.equal(call.body.model, "gpt-4o-mini");
    assert.deepEqual(call.body.response_format, { type: "json_object" });
    const system = call.body.messages.find((m) => m.role === "system")?.content ?? "";
    const user = call.body.messages.find((m) => m.role === "user")?.content ?? "";
    assert.match(system, new RegExp(SECRET_MARKER));
    assert.match(system, /sobre propiedades en Homestead para colombianos que viven en Colombia en Español\./);
    assert.match(system, /REGLAS DEL SISTEMA/);
    assert.match(user, /<datos_usuario>[\s\S]*ubicacion_negocio: Miami, Homestead[\s\S]*<\/datos_usuario>/);

    const rows = await rowsFor(u.userId);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].slot, 1);
    assert.equal(rows[0].categoryName, "Inversión");
    assert.equal(rows[0].offeredTitles.length, 9);
    assert.deepEqual(rows[0].inputs, inputs);
  });

  it("el prompt del administrador nunca vuelve al usuario", async () => {
    const u = await makeUser();
    responder = () => ok(mk("Beta", 9));
    const result = await lib.generateTitlesForUser(params(u));
    assert.doesNotMatch(JSON.stringify(result), new RegExp(SECRET_MARKER));
    const status = await lib.getTitleGenerationStatus(u.userId);
    assert.doesNotMatch(JSON.stringify(status), new RegExp(SECRET_MARKER));
    assert.equal(status.enabled, true);
  });

  it("tope de 3 por día: la 4ª se rechaza sin llamar a la IA", async () => {
    const u = await makeUser();
    responder = (_c, n) => ok(mk(`Gamma${n}`, 9));
    for (let i = 0; i < 3; i++) await lib.generateTitlesForUser(params(u));
    calls.length = 0;
    await assert.rejects(
      () => lib.generateTitlesForUser(params(u)),
      (error: unknown) => error instanceof lib.TitleGenerationError && error.code === "DAILY_LIMIT" && error.status === 429,
    );
    assert.equal(calls.length, 0);
    const status = await lib.getTitleGenerationStatus(u.userId);
    assert.deepEqual([status.used, status.remaining, status.max], [3, 0, 3]);
    assert.equal((await rowsFor(u.userId)).length, 3);
  });

  it("no repite entre solicitudes: lo ya ofrecido se filtra y se pide un reintento", async () => {
    const u = await makeUser();
    const first = mk("Delta", 9);
    responder = () => ok(first);
    await lib.generateTitlesForUser(params(u));

    calls.length = 0;
    // 1ª respuesta: 3 repetidos (con otra puntuación) + 4 nuevos; el reintento trae 5 nuevos.
    const repeated = first.slice(0, 3).map((t) => `¿${t.toUpperCase()}?`);
    const fresh1 = mk("Épsilon", 4);
    const fresh2 = mk("Zeta", 5);
    responder = (_c, n) => (n === 1 ? ok([...repeated, ...fresh1]) : ok(fresh2));
    const result = await lib.generateTitlesForUser(params(u));

    assert.equal(calls.length, 2, "un único reintento");
    assert.equal(result.titles.length, 9);
    assert.deepEqual(result.titles.slice(0, 4), fresh1);
    for (const t of first) assert.ok(!result.titles.includes(t), "no debe repetir lo ofrecido antes");
    // El reintento le dice a la IA cuántos faltan y cuáles ya tiene.
    const retryUser = calls[1].body.messages.find((m) => m.role === "user")?.content ?? "";
    assert.match(retryUser, /cantidad_maxima: 5/);
    assert.match(retryUser, new RegExp(fresh1[0].slice(0, 20)));
  });

  it("máximo dos llamadas: si aun así faltan, muestra los que hay (no inventa)", async () => {
    const u = await makeUser();
    calls.length = 0;
    responder = (_c, n) => (n === 1 ? ok(mk("Eta", 3)) : ok(mk("Theta", 2)));
    const result = await lib.generateTitlesForUser(params(u));
    assert.equal(calls.length, 2);
    assert.equal(result.titles.length, 5);
    assert.equal(result.partial, true);
  });

  it("si la IA falla, NO se consume la solicitud", async () => {
    const u = await makeUser();
    calls.length = 0;
    responder = () => ({ status: 500, json: { error: { message: "boom" } } });
    await assert.rejects(
      () => lib.generateTitlesForUser(params(u)),
      (error: unknown) => error instanceof lib.TitleGenerationError && error.code === "NO_VALID_TITLES" && error.status === 502,
    );
    assert.equal(calls.length, 2, "primera llamada + un reintento");
    assert.equal((await rowsFor(u.userId)).length, 0, "el cupo del día quedó libre");
    assert.equal((await lib.getTitleGenerationStatus(u.userId)).remaining, 3);

    responder = () => ok(mk("Iota", 9));
    const retry = await lib.generateTitlesForUser(params(u));
    assert.equal(retry.requestsRemaining, 2);
  });

  it("respuesta que no es JSON tampoco consume la solicitud", async () => {
    const u = await makeUser();
    responder = () => ({ status: 200, json: { choices: [{ message: { content: "texto suelto, no es JSON" } }] } });
    await assert.rejects(() => lib.generateTitlesForUser(params(u)), (e: unknown) => e instanceof lib.TitleGenerationError && e.code === "NO_VALID_TITLES");
    assert.equal((await rowsFor(u.userId)).length, 0);
  });

  it("concurrencia: 5 solicitudes simultáneas, exactamente 3 pasan (cupo atómico)", async () => {
    const u = await makeUser();
    calls.length = 0;
    responder = (_c, n) => ok(mk(`Kappa${n}`, 9));
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => lib.generateTitlesForUser(params(u))));
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    assert.equal(fulfilled.length, 3);
    assert.equal(rejected.length, 2);
    for (const r of rejected) assert.equal((r.reason as { code?: string }).code, "DAILY_LIMIT");
    assert.equal(calls.length, 3, "solo las que ganaron cupo llaman a la IA");
    const rows = await rowsFor(u.userId);
    assert.deepEqual(rows.map((r) => r.slot), [1, 2, 3]);
  });

  it("no repite títulos que el usuario ya creó/publicó", async () => {
    const u = await makeUser();
    const already = "Guía completa para comprar casa en Homestead Florida";
    const run = await db.prisma.run.create({ data: { userId: u.userId, categoryId: u.categoryId } });
    await db.prisma.title.create({ data: { runId: run.id, text: already, order: 0 } });
    responder = () => ok([already.toUpperCase(), ...mk("Lambda", 8)]);
    const result = await lib.generateTitlesForUser(params(u));
    assert.ok(!result.titles.some((t) => t.toLowerCase() === already.toLowerCase()));
    assert.equal(result.titles.length, 8);
  });

  it("barreras previas (sin gastar IA ni cupo): prueba vencida, sin cupo de publicación, categoría ajena, sin idioma", async () => {
    calls.length = 0;
    const expired = await makeUser({ isTrialSignup: true, trialUnlocked: false, trialStartedAt: new Date(Date.now() - 30 * 86400000) });
    await assert.rejects(() => lib.generateTitlesForUser(params(expired)), (e: unknown) => e instanceof lib.TitleGenerationError && e.code === "TRIAL_EXPIRED" && e.status === 403);

    const noQuota = await makeUser({ dailyArticleLimit: 0 });
    await assert.rejects(() => lib.generateTitlesForUser(params(noQuota)), (e: unknown) => e instanceof lib.TitleGenerationError && e.code === "NO_QUOTA" && e.status === 409);

    const a = await makeUser();
    const b = await makeUser();
    await assert.rejects(
      () => lib.generateTitlesForUser({ ...params(a), categoryId: b.categoryId }),
      (e: unknown) => e instanceof lib.TitleGenerationError && e.code === "NO_CATEGORY",
    );

    const noLang = await makeUser({ contentLanguage: "" });
    await assert.rejects(
      () => lib.generateTitlesForUser({ ...params(noLang), languageValue: "  " }),
      (e: unknown) => e instanceof lib.TitleGenerationError && e.code === "NO_LANGUAGE",
    );

    assert.equal(calls.length, 0);
    for (const u of [expired, noQuota, a, b, noLang]) assert.equal((await rowsFor(u.userId)).length, 0);
  });

  it("retención: a los 90 días se borra lo escrito, pero se conservan los títulos ofrecidos (y siguen impidiendo repetir)", async () => {
    const u = await makeUser();
    const oldTitle = "Título ofrecido hace cien días para Homestead Florida";
    const old = await db.prisma.titleGenerationRequest.create({
      data: {
        userId: u.userId,
        dayKey: "2026-01-01",
        slot: 1,
        categoryId: u.categoryId,
        categoryName: "Inversión",
        inputs: { tema: "lo que escribió" },
        offeredTitles: [oldTitle],
        createdAt: new Date(Date.now() - 100 * 86400000),
      },
    });
    responder = () => ok([oldTitle, ...mk("Mu", 9)]);
    const result = await lib.generateTitlesForUser(params(u));
    assert.ok(!result.titles.includes(oldTitle), "lo ofrecido hace 100 días no vuelve");

    const after = await db.prisma.titleGenerationRequest.findUniqueOrThrow({ where: { id: old.id } });
    assert.equal(after.inputs, null, "lo escrito se purgó");
    assert.deepEqual(after.offeredTitles, [oldTitle], "los títulos ofrecidos se conservan");
  });

  it("sin prompt en Administración: la función queda desactivada y no gasta nada", async () => {
    const u = await makeUser();
    await db.prisma.systemSetting.deleteMany({ where: { key: promptLib.TITLE_GENERATION_PROMPT_KEY } });
    calls.length = 0;
    assert.equal((await lib.getTitleGenerationStatus(u.userId)).enabled, false);
    await assert.rejects(() => lib.generateTitlesForUser(params(u)), (e: unknown) => e instanceof lib.TitleGenerationError && e.code === "PROMPT_NOT_CONFIGURED" && e.status === 409);
    assert.equal(calls.length, 0);
    assert.equal((await rowsFor(u.userId)).length, 0);
    await promptLib.setTitleGenerationPrompt(`${SECRET_MARKER}. Tema {{tema}}.`);
  });
});
