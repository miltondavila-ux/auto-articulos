import test from "node:test";
import assert from "node:assert/strict";
import { friendlyConnectionError } from "./composio-error-message";

const FALLBACK = "No se pudo completar. Inténtalo de nuevo.";
const GOOGLE_403 = `{ "error": { "code": 403, "message": "Request had insufficient authentication scopes.", "status": "PERMISSION_DENIED", "details": [{ "reason": "ACCESS_TOKEN_SCOPE_INSUFFICIENT", "domain": "googleapis.com" }] } }`;

test("falta de permiso de Google se explica sin JSON", () => {
  const out = friendlyConnectionError(GOOGLE_403, FALLBACK);
  assert.match(out, /Falta un permiso de Google/);
  assert.doesNotMatch(out, /[{}]|403|googleapis/);
});

test("autorización vencida", () => {
  assert.match(friendlyConnectionError("invalid_grant: Token has been expired or revoked", FALLBACK), /venció/);
});

test("sin permiso sobre el sitio", () => {
  assert.match(friendlyConnectionError("User does not have sufficient permission for site", FALLBACK), /no tiene permiso sobre ese sitio/);
});

test("cuota y fallas de red", () => {
  assert.match(friendlyConnectionError("429 quota exceeded", FALLBACK), /muy ocupado/);
  assert.match(friendlyConnectionError("fetch failed", FALLBACK), /No pudimos comunicarnos/);
});

test("JSON desconocido usa el mensaje de respaldo y nunca se muestra", () => {
  assert.equal(friendlyConnectionError('{"foo":"bar"}', FALLBACK), FALLBACK);
});

test("mensajes ya claros en español se conservan; vacío usa respaldo", () => {
  assert.equal(friendlyConnectionError("Elige una opción primero.", FALLBACK), "Elige una opción primero.");
  assert.equal(friendlyConnectionError(undefined, FALLBACK), FALLBACK);
});

test("errores técnicos en inglés nunca se muestran", () => {
  const raw = 'Could not find connected account(s) abc belonging to user "u1". Check that the IDs are correct and belong to the same user as this session.';
  assert.match(friendlyConnectionError(raw, FALLBACK), /ya no existe/);
  assert.equal(friendlyConnectionError("Something went wrong on the server", FALLBACK), FALLBACK);
});
