import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ComposioApiError,
  composioInspectUrl,
  composioListSearchConsoleSites,
  composioListSitemaps,
  composioQuerySearchAnalytics,
  composioSubmitSitemap,
} from "@auto-articulos/shared";

const ACCOUNT = { apiKey: "ck_test_1234567890", userId: "user-1", connectedAccountId: "ca_1" };

/** Simula sesión → ejecución → borrado; devuelve lo que se ejecutó. */
function stub(execReply: { status?: number; body: unknown }) {
  const calls: Array<{ url: string; body: any }> = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (url.endsWith("/tool_router/session")) return new Response(JSON.stringify({ session_id: "s1" }), { status: 201 });
    if (url.endsWith("/execute")) return new Response(JSON.stringify(execReply.body), { status: execReply.status ?? 200 });
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  return { exec: () => calls.find((c) => c.url.endsWith("/execute"))!.body, restore: () => { globalThis.fetch = original; } };
}

test("sitios: misma forma que listGoogleSearchConsoleSites (siteEntry) y sin argumentos", async () => {
  const s = stub({ body: { data: { siteEntry: [{ siteUrl: "https://a.com/", permissionLevel: "siteOwner" }] }, error: null } });
  try {
    assert.deepEqual(await composioListSearchConsoleSites(ACCOUNT), [{ siteUrl: "https://a.com/", permissionLevel: "siteOwner" }]);
    assert.deepEqual(s.exec(), { tool_slug: "GOOGLE_SEARCH_CONSOLE_LIST_SITES", arguments: {} });
  } finally { s.restore(); }
});

test("sitios: sin datos devuelve lista vacía (no lanza)", async () => {
  const s = stub({ body: { data: {}, error: null } });
  try { assert.deepEqual(await composioListSearchConsoleSites(ACCOUNT), []); } finally { s.restore(); }
});

test("sitemaps: devuelve solo las rutas, ignorando entradas sin ruta", async () => {
  const s = stub({ body: { data: { sitemap: [{ path: "https://a.com/sitemap.xml" }, {}, { path: "" }, { path: "https://a.com/s2.xml" }] }, error: null } });
  try {
    assert.deepEqual(await composioListSitemaps(ACCOUNT, "https://a.com/"), ["https://a.com/sitemap.xml", "https://a.com/s2.xml"]);
    assert.deepEqual(s.exec().arguments, { site_url: "https://a.com/" });
  } finally { s.restore(); }
});

test("enviar sitemap: argumentos site_url y feedpath, sin devolver nada", async () => {
  const s = stub({ body: { data: {}, error: null } });
  try {
    assert.equal(await composioSubmitSitemap(ACCOUNT, "https://a.com/", "https://a.com/sitemap.xml"), undefined);
    assert.deepEqual(s.exec(), { tool_slug: "GOOGLE_SEARCH_CONSOLE_SUBMIT_SITEMAP", arguments: { site_url: "https://a.com/", feedpath: "https://a.com/sitemap.xml" } });
  } finally { s.restore(); }
});

test("inspección: devuelve indexStatusResult como inspectGoogleUrl, o {} si falta", async () => {
  let s = stub({ body: { data: { inspectionResult: { indexStatusResult: { verdict: "PASS", coverageState: "Indexed" } } }, error: null } });
  try {
    assert.deepEqual(await composioInspectUrl(ACCOUNT, "https://a.com/", "https://a.com/p"), { verdict: "PASS", coverageState: "Indexed" });
    assert.deepEqual(s.exec().arguments, { site_url: "https://a.com/", inspection_url: "https://a.com/p", language_code: "es" });
  } finally { s.restore(); }
  s = stub({ body: { data: {}, error: null } });
  try { assert.deepEqual(await composioInspectUrl(ACCOUNT, "https://a.com/", "https://a.com/p"), {}); } finally { s.restore(); }
});

test("métricas: mismos parámetros que queryGoogleSearchAnalytics (5000 filas, datos finales) y filas tal cual", async () => {
  const rows = [{ keys: ["q", "https://a.com/p"], clicks: 3, impressions: 40, ctr: 0.07, position: 8.1 }];
  const s = stub({ body: { data: { rows }, error: null } });
  try {
    assert.deepEqual(await composioQuerySearchAnalytics(ACCOUNT, "https://a.com/", "2026-08-01", "2026-08-28"), rows);
    assert.deepEqual(s.exec().arguments, { site_url: "https://a.com/", start_date: "2026-08-01", end_date: "2026-08-28", dimensions: ["query", "page"], row_limit: 5000, data_state: "final" });
  } finally { s.restore(); }
});

test("errores de Composio se propagan sin ocultarse", async () => {
  const s = stub({ body: { data: null, error: "el usuario no es propietario del sitio" } });
  try {
    await assert.rejects(composioSubmitSitemap(ACCOUNT, "https://a.com/", "https://a.com/s.xml"), (e: unknown) => e instanceof ComposioApiError && /propietario/.test(e.message));
  } finally { s.restore(); }
});
