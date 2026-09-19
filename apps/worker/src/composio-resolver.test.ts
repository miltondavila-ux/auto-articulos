import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COMPOSIO_CONSUMER_READY,
  methodFor,
  needsReconnectAlert,
  resolveConnection,
  type ComposioAppId,
} from "@auto-articulos/shared";

const APPS: ComposioAppId[] = ["google_search_console", "google_analytics", "facebook", "instagram"];
const active = { status: "ACTIVE", hasSelection: true };

test("INERTE por ahora: con los consumidores sin listos el método es SIEMPRE OWN", () => {
  for (const app of APPS) {
    assert.equal(COMPOSIO_CONSUMER_READY[app], false, `${app} no debe estar listo todavía`);
    for (const moduleEnabled of [false, true]) for (const routeIsComposio of [false, true]) {
      assert.equal(methodFor({ app, moduleEnabled, routeIsComposio }), "OWN");
    }
  }
});

test("método OWN: usa la propia si existe; si no, sin conexión", () => {
  assert.deepEqual(resolveConnection({ method: "OWN", hasOwn: true, composio: null }), { source: "OWN" });
  assert.deepEqual(resolveConnection({ method: "OWN", hasOwn: false, composio: null }), { source: "NONE", reason: "NOT_CONNECTED" });
  // una conexión Composio activa NO se usa si el método sigue siendo OWN
  assert.deepEqual(resolveConnection({ method: "OWN", hasOwn: true, composio: active }), { source: "OWN" });
});

test("método COMPOSIO: usa Composio solo si está ACTIVA y con elección aprobada", () => {
  assert.deepEqual(resolveConnection({ method: "COMPOSIO", hasOwn: true, composio: active }), { source: "COMPOSIO" });
  for (const composio of [
    null,
    { status: "INITIATED", hasSelection: false },
    { status: "FAILED", hasSelection: false },
    { status: "REVOKED", hasSelection: true },
    { status: "ACTIVE", hasSelection: false }, // conectó pero aún no eligió ni aprobó
  ]) {
    assert.equal(resolveConnection({ method: "COMPOSIO", hasOwn: true, composio }).source, "NONE");
  }
});

test("método COMPOSIO sin reconectar: la propia queda IGNORADA (P2), no borrada, y se pide reconectar", () => {
  assert.deepEqual(resolveConnection({ method: "COMPOSIO", hasOwn: true, composio: null }), { source: "NONE", reason: "RECONNECT_REQUIRED" });
  assert.deepEqual(resolveConnection({ method: "COMPOSIO", hasOwn: false, composio: null }), { source: "NONE", reason: "NOT_CONNECTED" });
});

test("revertir el switch restaura la conexión propia al instante", () => {
  const conmutado = resolveConnection({ method: "COMPOSIO", hasOwn: true, composio: null });
  assert.equal(conmutado.source, "NONE");
  assert.deepEqual(resolveConnection({ method: "OWN", hasOwn: true, composio: null }), { source: "OWN" });
});

test("alerta del HOME: SOLO Search Console, y solo si tenía conexión propia y no reconectó", () => {
  assert.equal(needsReconnectAlert({ app: "google_search_console", method: "COMPOSIO", hasOwn: true, composio: null }), true);
  assert.equal(needsReconnectAlert({ app: "google_search_console", method: "COMPOSIO", hasOwn: true, composio: active }), false, "desaparece al reconectar");
  assert.equal(needsReconnectAlert({ app: "google_search_console", method: "COMPOSIO", hasOwn: false, composio: null }), false, "nunca tuvo Search Console: no hay nada que reconectar");
  assert.equal(needsReconnectAlert({ app: "google_search_console", method: "OWN", hasOwn: true, composio: null }), false, "método propio: sin alerta");
  for (const app of ["google_analytics", "facebook", "instagram"] as ComposioAppId[]) {
    assert.equal(needsReconnectAlert({ app, method: "COMPOSIO", hasOwn: true, composio: null }), false, `${app} es opcional y nunca alerta`);
  }
});

test("si algún día un consumidor está listo, el módulo habilitado o el interruptor activan Composio", () => {
  const original = COMPOSIO_CONSUMER_READY.google_search_console;
  try {
    COMPOSIO_CONSUMER_READY.google_search_console = true;
    assert.equal(methodFor({ app: "google_search_console", moduleEnabled: true, routeIsComposio: false }), "COMPOSIO");
    assert.equal(methodFor({ app: "google_search_console", moduleEnabled: false, routeIsComposio: true }), "COMPOSIO");
    assert.equal(methodFor({ app: "google_search_console", moduleEnabled: false, routeIsComposio: false }), "OWN");
    assert.equal(methodFor({ app: "google_analytics", moduleEnabled: true, routeIsComposio: true }), "OWN", "las demás apps siguen sin estar listas");
  } finally {
    COMPOSIO_CONSUMER_READY.google_search_console = original;
  }
});
