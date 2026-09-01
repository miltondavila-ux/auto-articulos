import assert from "node:assert/strict";
import { test } from "node:test";
import {
  describeContentLanguage,
  resolveContentLanguageOption,
} from "./contentLanguage";

const liveOptions = [
  { value: "es_ES", text: "Spanish" },
  { value: "en_VI", text: "English" },
  { value: "fr_FR", text: "French" },
];

test("resuelve el código corto al valor real del selector remoto", () => {
  assert.deepEqual(
    resolveContentLanguageOption("en", liveOptions),
    { value: "en_VI", text: "English" },
  );
});

test("prioriza el valor exacto cuando existen variantes del mismo idioma", () => {
  const options = [
    { value: "en", text: "English (legacy)" },
    { value: "en_VI", text: "English" },
  ];

  assert.deepEqual(resolveContentLanguageOption("en", options), options[0]);
  assert.deepEqual(resolveContentLanguageOption("en_VI", options), options[1]);
});

test("resuelve el nombre visible y rechaza valores desconocidos", () => {
  assert.deepEqual(
    resolveContentLanguageOption("English", liveOptions),
    { value: "en_VI", text: "English" },
  );
  assert.equal(resolveContentLanguageOption("xx", liveOptions), null);
  assert.equal(resolveContentLanguageOption("", liveOptions), null);
});

test("describe los códigos reales para instrucciones de redacción", () => {
  assert.equal(describeContentLanguage("en_VI"), "English");
  assert.equal(describeContentLanguage("es_ES"), "Spanish");
  assert.equal(describeContentLanguage("xx_XX"), "xx_XX");
});
