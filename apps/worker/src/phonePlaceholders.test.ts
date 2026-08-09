import assert from "node:assert/strict";
import { test } from "node:test";
import { replacePhonePlaceholders } from "./phonePlaceholders";

test("repara WhatsApp normal, QR de WhatsApp y llamada", () => {
  const source = [
    '<a href="https://wa.me/PHONE_NUMBER">WhatsApp</a>',
    '<img src="https://api.qrserver.com/v1/create-qr-code/?data=https://wa.me/PHONE_NUMBER">',
    '<a href="tel:PHONE_NUMBER">Llamar</a>',
  ].join("");
  const result = replacePhonePlaceholders(source, "+1 (954) 652-9929");

  assert.equal(result.html.includes("PHONE_NUMBER"), false);
  assert.equal(result.html.includes("https://wa.me/19546529929"), true);
  assert.equal(result.html.includes("tel:+19546529929"), true);
  assert.deepEqual(result.replacements, { whatsapp: 2, call: 1, other: 0 });
});

test("repara WhatsApp codificado dentro de un QR", () => {
  const source =
    "https://api.qrserver.com/v1/create-qr-code/?data=https%3A%2F%2Fwa.me%2FPHONE_NUMBER";
  const result = replacePhonePlaceholders(source, "+19546529929");

  assert.equal(result.html.endsWith("wa.me%2F19546529929"), true);
  assert.equal(result.replacements.whatsapp, 1);
});

test("quita el signo más incorrecto que dejó la reparación anterior", () => {
  const source = [
    'https://wa.me/+19546529929',
    'https://api.qrserver.com/?data=https://wa.me/+19546529929',
    'tel:+19546529929',
  ].join("|");
  const result = replacePhonePlaceholders(source, "+19546529929");

  assert.equal(result.html.includes("wa.me/+"), false);
  assert.equal(result.html.includes("tel:+19546529929"), true);
  assert.deepEqual(result.replacements, { whatsapp: 2, call: 1, other: 0 });
});

test("repara el marcador alternativo del enlace exterior del QR", () => {
  const source = [
    '<a href="https://wa.me/NUMERO-WHATSAPP">',
    '<img src="https://quickchart.io/chart?chl=https://wa.me/PHONE_NUMBER">',
    "</a>",
  ].join("");
  const result = replacePhonePlaceholders(source, "+19546529929");

  assert.equal(result.html.includes("NUMERO-WHATSAPP"), false);
  assert.equal(result.html.includes("PHONE_NUMBER"), false);
  assert.equal(result.replacements.whatsapp, 2);
});

test("rechaza teléfonos sin dígitos", () => {
  assert.throws(() => replacePhonePlaceholders("tel:PHONE_NUMBER", "sin teléfono"));
});
