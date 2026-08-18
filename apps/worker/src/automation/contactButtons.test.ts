import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildContactButtonsHtml,
  removeGeneratedContactLinks,
} from "./10minutesWebsite";
import {
  normalizePhonePlaceholders,
  replacePhonePlaceholders,
} from "../phonePlaceholders";

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

test("repara un marcador de WhatsApp doblemente codificado", () => {
  const broken = 'href="https://api.whatsapp.com/resolve/?deeplink=%2F%257BTELEFONO%257D&not_found=1"';
  const normalized = normalizePhonePlaceholders(broken);
  const repaired = replacePhonePlaceholders(normalized, "1 (786) 608-8613");

  assert.equal(normalized.includes("%257BTELEFONO%257D"), false);
  assert.match(repaired.html, /href="https:\/\/wa\.me\/17866088613/);
  assert.equal(repaired.html.includes("TELEFONO"), false);
});

test("descarta CTAs generados para usar solamente los botones oficiales", () => {
  const generated = '<p><a href="https://api.whatsapp.com/resolve/?deeplink=%2F%257BTELEFONO%257D">WhatsApp</a> <a href="tel:{TELEFONO}">Llamar</a></p>';
  const cleaned = removeGeneratedContactLinks(generated);
  const official = buildContactButtonsHtml("17866088613", "CONTACTA AHORA", "LLAMA AHORA");

  assert.equal(cleaned.includes("api.whatsapp.com"), false);
  assert.equal(cleaned.includes("tel:"), false);
  assert.match(official, /href="https:\/\/wa\.me\/17866088613"/);
  assert.match(official, /href="tel:17866088613"/);
});
