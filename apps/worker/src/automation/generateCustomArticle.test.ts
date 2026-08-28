import assert from "node:assert/strict";
import { test } from "node:test";
import {
  convertGeneratedTablesToLists,
  sanitizeGeneratedArticleResult,
} from "./generateCustomArticle";

test("resuelve marcadores recuperables sin rechazar el artículo", () => {
  const result = sanitizeGeneratedArticleResult(
    {
      title: "Guía de {NOMBRE_AUTOR}",
      summary: "Consulta con {NOMBRE_AUTOR} en {CIUDAD_ESTADO}",
      contentHtml: "<p>Llama al {TELEFONO}. {NOMBRE_AUTOR} atiende en {CIUDAD_ESTADO}.</p>",
    },
    "Milton Dávila",
  );

  assert.equal(result.title, "Guía de Milton Dávila");
  assert.equal(result.summary, "Consulta con Milton Dávila en");
  assert.match(result.contentHtml, /Llama al PHONE_NUMBER/);
  assert.equal(result.contentHtml.includes("{NOMBRE_AUTOR}"), false);
  assert.equal(result.contentHtml.includes("{CIUDAD_ESTADO}"), false);
});

test("elimina JSON-LD o scripts sin perder el artículo visible", () => {
  const result = sanitizeGeneratedArticleResult({
    title: "Cuenta bancaria en Miami",
    summary: "Requisitos para abrir una cuenta bancaria.",
    contentHtml: '<p>Contenido útil para inmigrantes.</p><script type="application/ld+json">{"@context":"https://schema.org"}</script><p>Documentos necesarios.</p>',
  });

  assert.equal(result.contentHtml.includes("<script"), false);
  assert.match(result.contentHtml, /Contenido útil para inmigrantes/);
  assert.match(result.contentHtml, /Documentos necesarios/);
});

test("convierte tablas informativas en una lista legible", () => {
  const result = convertGeneratedTablesToLists(
    "<table><thead><tr><th>Dato</th><th>Descripción</th></tr></thead><tbody><tr><td>Más de 2 millones de usuarios</td><td>En 2023, más de 2 millones de floridanos están inscritos.</td></tr><tr><td>Subsidios disponibles</td><td>Reducen los costos mensuales.</td></tr></tbody></table>",
  );

  assert.equal(result.includes("<table"), false);
  assert.equal(result.includes("<tr"), false);
  assert.match(result, /<ul>/);
  assert.match(result, /<strong>Más de 2 millones de usuarios<\/strong>: En 2023/);
  assert.match(result, /<strong>Subsidios disponibles<\/strong>: Reducen/);
});
