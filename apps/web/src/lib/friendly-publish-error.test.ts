import test from "node:test";
import assert from "node:assert/strict";
import { friendlyPublishError } from "@auto-articulos/shared/src/friendly-error";

test("error de permisos de Meta se explica en español", () => {
  const out = friendlyPublishError('{"error":{"message":"(#200) Requires pages_manage_posts permission","code":200}}', "Facebook");
  assert.match(out, /Falta un permiso/);
  assert.doesNotMatch(out, /[{}]|#200/);
});

test("token vencido de Meta", () => {
  assert.match(friendlyPublishError("Error validating access token: Session has expired (#190)"), /venció|retirada/);
});

test("límite de uso y publicación repetida", () => {
  assert.match(friendlyPublishError("(#4) Application request limit reached"), /limitando/);
  assert.match(friendlyPublishError("Duplicate status message"), /repetida/);
});

test("autorización vencida con cola técnica se explica como vencida", () => {
  const out = friendlyPublishError('La autorización de Blogger expiró y no pudo renovarse: {"error":"invalid_grant"}');
  assert.match(out, /venció|retirada/);
  assert.doesNotMatch(out, /[{}]|invalid_grant/);
});

test("mensaje en español conserva el texto y pierde la cola técnica", () => {
  const out = friendlyPublishError('No se pudo leer el tablero de Pinterest: {"code":123,"note":"x"}');
  assert.equal(out, "No se pudo leer el tablero de Pinterest.");
});

test("texto desconocido en inglés usa el mensaje de respaldo con el nombre de la red", () => {
  const out = friendlyPublishError("Something odd happened upstream", "Pinterest");
  assert.match(out, /No se pudo publicar en Pinterest/);
});

test("vacío y la palabra del proveedor", () => {
  assert.match(friendlyPublishError(""), /No se pudo publicar/);
  assert.doesNotMatch(friendlyPublishError("Falló la conexión con Composio para tu cuenta"), /composio/i);
});
