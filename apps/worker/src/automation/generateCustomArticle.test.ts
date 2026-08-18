import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeGeneratedArticleResult } from "./generateCustomArticle";

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
