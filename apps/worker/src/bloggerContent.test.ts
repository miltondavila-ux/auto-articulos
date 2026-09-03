import assert from "node:assert/strict";
import test from "node:test";
import { formatBloggerSummary } from "./bloggerContent";

test("formatea el resumen Blogger en párrafos y convierte el marcador en enlace", () => {
  const html = formatBloggerSummary(
    "Mudarte puede cambiar tu red médica.\n\nRevisa estos pasos antes de elegir: [ENLACE]",
    "https://example.com/articulo?tipo=salud&zona=florida",
  );

  assert.match(html, /^<p>Mudarte puede cambiar tu red médica\.<\/p>/);
  assert.match(html, /<p>Revisa estos pasos antes de elegir: <a href="https:\/\/example\.com\/articulo\?tipo=salud&amp;zona=florida">Leer el artículo completo<\/a><\/p>$/);
  assert.doesNotMatch(html, /<h[1-6]|##|\]\(/);
});

test("escapa HTML del copy y agrega el enlace si falta el marcador", () => {
  const html = formatBloggerSummary(
    "<script>alert(1)</script>\nLínea **importante**",
    "https://example.com/seguro?a=\"1\"",
  );

  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /Línea importante/);
  assert.match(html, /<a href="https:\/\/example\.com\/seguro\?a=&quot;1&quot;">Leer el artículo completo<\/a>/);
  assert.doesNotMatch(html, /<script>/);
});
