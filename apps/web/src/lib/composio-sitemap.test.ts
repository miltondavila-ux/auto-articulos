import test from "node:test";
import assert from "node:assert/strict";
import { defaultSitemapUrl, isSitemapListed, sitemapMessage } from "./composio-sitemap";

test("sitemap por defecto de dominio y de prefijo de URL", () => {
  assert.equal(defaultSitemapUrl("sc-domain:ejemplo.com"), "https://ejemplo.com/sitemap.xml");
  assert.equal(defaultSitemapUrl("https://www.ejemplo.com/blog/"), "https://www.ejemplo.com/sitemap.xml");
});

test("detecta sitemap ya enviado ignorando www, http y barra final", () => {
  assert.equal(isSitemapListed(["http://www.ejemplo.com/sitemap.xml/"], "https://ejemplo.com/sitemap.xml"), true);
  assert.equal(isSitemapListed(["https://ejemplo.com/otro.xml"], "https://ejemplo.com/sitemap.xml"), false);
  assert.equal(isSitemapListed([], "https://ejemplo.com/sitemap.xml"), false);
});

test("mensajes claros para cada resultado", () => {
  assert.match(sitemapMessage({ status: "ALREADY", url: "https://a.com/sitemap.xml" }) ?? "", /ya estaba en Google/);
  assert.match(sitemapMessage({ status: "SENT", url: "https://a.com/sitemap.xml" }) ?? "", /Enviamos tu sitemap/);
  assert.match(sitemapMessage({ status: "FAILED", url: "" }) ?? "", /envío diario/);
  assert.equal(sitemapMessage(null), null);
});
