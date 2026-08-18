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
