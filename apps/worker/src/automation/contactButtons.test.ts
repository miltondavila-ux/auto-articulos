import assert from "node:assert/strict";
import { test } from "node:test";
import { buildContactButtonsHtml } from "./10minutesWebsite";

test("crea botones de WhatsApp y llamada con el teléfono normalizado", () => {
  const html = buildContactButtonsHtml(
    "+1 (786) 608-8613",
    "CONTACTA AHORA",
    "LLAMA AHORA",
  );

  assert.match(html, /href="https:\/\/wa\.me\/17866088613"/);
  assert.match(html, /href="tel:17866088613"/);
  assert.match(html, />CONTACTA AHORA<\/a>/);
  assert.match(html, />LLAMA AHORA<\/a>/);
});

test("permite añadir únicamente el botón que falta", () => {
  const html = buildContactButtonsHtml("17866088613", "CONTACTA AHORA", "LLAMA AHORA", false, true);

  assert.equal(html.includes("wa.me"), false);
  assert.match(html, /href="tel:17866088613"/);
});
