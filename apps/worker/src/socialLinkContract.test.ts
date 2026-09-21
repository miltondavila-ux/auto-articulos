import test from "node:test";
import assert from "node:assert/strict";
import { buildSafeCaption } from "@auto-articulos/shared";
import { formatBloggerSummary } from "./bloggerContent";

const articleUrl = "https://www.example.com/articulos/una-url-larga";

test("captions de redes no-Instagram conservan el enlace completo al recortar", () => {
  for (const maxChars of [280, 300, 500, 3000]) {
    const caption = buildSafeCaption("Texto generado ".repeat(1000), articleUrl, {
      maxChars,
      ...(maxChars === 280 ? { linkCostOverride: 23 } : {}),
    });
    assert.ok(caption.includes(articleUrl), `falta el enlace en límite ${maxChars}`);
    assert.equal(caption.slice(caption.indexOf(articleUrl), caption.indexOf(articleUrl) + articleUrl.length), articleUrl);
  }
});

test("Blogger convierte el enlace en un anchor HTML clicable", () => {
  const html = formatBloggerSummary("Lee más: [ENLACE]", articleUrl);
  assert.match(html, new RegExp(`<a href="${articleUrl.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}">`));
});
