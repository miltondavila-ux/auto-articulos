import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COMPOSIO_TEST_TOOL,
  COMPOSIO_TOOL_ALLOWLIST,
  ComposioApiError,
  createConnectLink,
  isToolAllowed,
  runAllowedTool,
  type ComposioAppId,
} from "@auto-articulos/shared";

type Call = { method: string; url: string; key: string | null; body: any };
const KEY = "ck_test_llave_secreta_1234567890";

function stubFetch(replies: Array<{ status?: number; body?: unknown; headers?: Record<string, string> }>) {
  const calls: Call[] = [];
  const original = globalThis.fetch;
  let i = 0;
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    calls.push({
      method: String(init?.method ?? "GET"),
      url: String(input),
      key: new Headers(init?.headers).get("x-api-key"),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    const r = replies[Math.min(i++, replies.length - 1)];
    return new Response(r.status === 204 ? null : JSON.stringify(r.body ?? {}), { status: r.status ?? 200, headers: r.headers });
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

test("lista blanca: permite lo que se usa hoy y bloquea lo destructivo", () => {
  assert.equal(isToolAllowed("google_search_console", "GOOGLE_SEARCH_CONSOLE_SUBMIT_SITEMAP"), true);
  assert.equal(isToolAllowed("instagram", "INSTAGRAM_POST_IG_USER_MEDIA"), true);
  for (const [app, slug] of [
    ["google_search_console", "GOOGLE_SEARCH_CONSOLE_DELETE_SITE"],
    ["google_search_console", "GOOGLE_SEARCH_CONSOLE_ADD_SITE"],
    ["google_analytics", "GOOGLE_ANALYTICS_CREATE_PROPERTY"],
    ["facebook", "FACEBOOK_GET_PAGE_CONVERSATIONS"],
    ["instagram", "INSTAGRAM_LIST_ALL_MESSAGES"],
    ["instagram", "INSTAGRAM_POST_IG_MEDIA_COMMENTS"],
    ["facebook", "FACEBOOK_LIST_MANAGED_PAGES_X"],
    ["facebook", ""],
  ] as Array<[ComposioAppId, string]>) {
    assert.equal(isToolAllowed(app, slug), false, `${app}/${slug} debería estar bloqueada`);
  }
  // una herramienta de una app no vale para otra
  assert.equal(isToolAllowed("facebook", "GOOGLE_SEARCH_CONSOLE_LIST_SITES"), false);
});

test("lista blanca: cada herramienta de prueba es de lectura y está permitida", () => {
  for (const app of Object.keys(COMPOSIO_TEST_TOOL) as ComposioAppId[]) {
    const tool = COMPOSIO_TOOL_ALLOWLIST[app].find((t) => t.slug === COMPOSIO_TEST_TOOL[app]);
    assert.ok(tool, `${app}: la herramienta de prueba no está en la lista blanca`);
    assert.equal(tool!.kind, "read");
  }
});

test("runAllowedTool rechaza una herramienta no permitida SIN llamar a Composio", async () => {
  const stub = stubFetch([{}]);
  try {
    await assert.rejects(
      runAllowedTool(KEY, { app: "google_search_console", userId: "u1", connectedAccountId: "ca_1", toolSlug: "GOOGLE_SEARCH_CONSOLE_DELETE_SITE" }),
      (e: unknown) => e instanceof ComposioApiError && e.slug === "TOOL_NOT_ALLOWED",
    );
    assert.equal(stub.calls.length, 0);
  } finally { stub.restore(); }
});

test("runAllowedTool: sesión limitada al toolkit, cuenta y herramientas; ejecuta y la elimina", async () => {
  const stub = stubFetch([
    { body: { session_id: "sess_1" } },
    { body: { data: { sites: [1, 2] }, error: null, log_id: "log_9" } },
    { body: { success: true } },
  ]);
  try {
    const r = await runAllowedTool(KEY, { app: "google_search_console", userId: "user-42", connectedAccountId: "ca_77", toolSlug: "GOOGLE_SEARCH_CONSOLE_LIST_SITES", args: { a: 1 } });
    assert.deepEqual(r, { data: { sites: [1, 2] }, logId: "log_9" });
    const [create, exec, del] = stub.calls;
    assert.equal(create.method, "POST"); assert.ok(create.url.endsWith("/api/v3.1/tool_router/session"));
    assert.equal(create.body.user_id, "user-42");
    assert.deepEqual(create.body.toolkits, { enable: ["google_search_console"] });
    assert.deepEqual(create.body.connected_accounts, { google_search_console: ["ca_77"] });
    assert.deepEqual(create.body.tools.google_search_console.enable, COMPOSIO_TOOL_ALLOWLIST.google_search_console.map((t) => t.slug));
    assert.equal(create.body.manage_connections.enable, false);
    assert.ok(exec.url.endsWith("/tool_router/session/sess_1/execute"));
    assert.deepEqual(exec.body, { tool_slug: "GOOGLE_SEARCH_CONSOLE_LIST_SITES", arguments: { a: 1 } });
    assert.equal(del.method, "DELETE"); assert.ok(del.url.endsWith("/tool_router/session/sess_1"));
    for (const c of stub.calls) assert.equal(c.key, KEY);
  } finally { stub.restore(); }
});

test("runAllowedTool: si la herramienta devuelve error, lanza y elimina la sesión igualmente", async () => {
  const stub = stubFetch([{ body: { session_id: "sess_2" } }, { body: { data: null, error: "cuenta sin permisos" } }, { body: {} }]);
  try {
    await assert.rejects(
      runAllowedTool(KEY, { app: "facebook", userId: "u", connectedAccountId: "ca", toolSlug: "FACEBOOK_LIST_MANAGED_PAGES" }),
      (e: unknown) => e instanceof ComposioApiError && e.slug === "TOOL_ERROR" && /sin permisos/.test(e.message),
    );
    assert.equal(stub.calls.at(-1)!.method, "DELETE");
  } finally { stub.restore(); }
});

test("runAllowedTool: un fallo al eliminar la sesión no oculta el resultado", async () => {
  const stub = stubFetch([{ body: { session_id: "sess_3" } }, { body: { data: 1, error: null } }, { status: 500, body: { error: { message: "x" } } }]);
  try {
    const r = await runAllowedTool(KEY, { app: "instagram", userId: "u", connectedAccountId: "ca", toolSlug: "INSTAGRAM_GET_USER_INFO" });
    assert.equal(r.data, 1);
  } finally { stub.restore(); }
});

test("errores de Composio: 403 con permiso, 429 con Retry-After; la clave nunca aparece en el mensaje", async () => {
  let stub = stubFetch([{ status: 403, body: { error: { message: "requires session_management write", slug: "APIKey_InsufficientPermissions" } } }]);
  try {
    await assert.rejects(
      runAllowedTool(KEY, { app: "facebook", userId: "u", connectedAccountId: "ca", toolSlug: "FACEBOOK_LIST_MANAGED_PAGES" }),
      (e: unknown) => e instanceof ComposioApiError && e.status === 403 && e.slug === "APIKey_InsufficientPermissions" && !e.message.includes(KEY),
    );
  } finally { stub.restore(); }
  stub = stubFetch([{ status: 429, headers: { "Retry-After": "12" }, body: {} }]);
  try {
    await assert.rejects(createConnectLink(KEY, { authConfigId: "ac_x", userId: "u", callbackUrl: "https://x/cb" }), (e: unknown) => e instanceof ComposioApiError && e.status === 429 && e.message.includes("12"));
  } finally { stub.restore(); }
});

test("createConnectLink: cuerpo correcto y exige redirect_url y connected_account_id", async () => {
  let stub = stubFetch([{ status: 201, body: { redirect_url: "https://connect.composio.dev/link/lk_1", connected_account_id: "ca_9", expires_at: "2026-09-20T00:00:00Z" } }]);
  try {
    const l = await createConnectLink(KEY, { authConfigId: "ac_1", userId: "user-1", callbackUrl: "https://app/cb?app=facebook" });
    assert.deepEqual(l, { redirectUrl: "https://connect.composio.dev/link/lk_1", connectedAccountId: "ca_9", expiresAt: "2026-09-20T00:00:00Z" });
    assert.deepEqual(stub.calls[0].body, { auth_config_id: "ac_1", user_id: "user-1", callback_url: "https://app/cb?app=facebook" });
  } finally { stub.restore(); }
  stub = stubFetch([{ status: 201, body: { redirect_url: "https://x" } }]);
  try {
    await assert.rejects(createConnectLink(KEY, { authConfigId: "ac", userId: "u", callbackUrl: "https://x" }), ComposioApiError);
  } finally { stub.restore(); }
});
