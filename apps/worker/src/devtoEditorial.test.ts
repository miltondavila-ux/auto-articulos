import test from "node:test";
import assert from "node:assert/strict";
import { deriveDevToEditorialTags, isDevToEligible } from "./devtoEditorial";

test("elige tags DEV.to pertinentes y limita a cuatro", () => {
  const tags = deriveDevToEditorialTags("Tutorial de TypeScript y APIs", "Construye un backend con Node y testing", "Desarrollo web");
  assert.deepEqual(tags, ["typescript", "node", "api", "testing"]);
  assert.equal(tags.length, 4);
});

test("rechaza contenido que solo intenta usar DEV.to como canal de backlinks", () => {
  assert.equal(isDevToEligible("Consejos para elegir un seguro de vida", "Coberturas y primas para familias", "Contenido comercial sin tema técnico"), false);
});

test("acepta contenido técnico aunque esté redactado en español", () => {
  assert.equal(isDevToEligible("Cómo proteger una API con autenticación", "Guía práctica para developers", "Implementa middleware y testing"), true);
});
