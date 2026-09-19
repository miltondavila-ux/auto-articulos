import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAnalyticsTraffic, applySearchConsoleStats, buildOptions, markCurrentSelection, summarizeSearchConsoleQuery, optionsForSearchConsole, summarizeAnalyticsReport } from "./composio-options";

// Forma REAL de GOOGLE_SEARCH_CONSOLE_LIST_SITES verificada el 2026-09-19.
const gsc = {
  siteEntry: [
    { permissionLevel: "siteUnverifiedUser", siteUrl: "https://www.otro-sitio.com/" },
    { permissionLevel: "siteOwner", siteUrl: "https://www.mi-sitio.com/" },
    { permissionLevel: "siteFullUser", siteUrl: "sc-domain:tercero.com" },
  ],
};

test("Search Console: solo se puede elegir donde se pueden enviar sitemaps", () => {
  const o = optionsForSearchConsole(gsc, null);
  assert.equal(o.length, 3);
  assert.equal(o[0].selectable, false); assert.match(o[0].reason!, /propietario/i);
  assert.equal(o[1].selectable, true); assert.match(o[1].detail!, /^Propietario · prefijo de URL · código https:\/\/www\.mi-sitio\.com\/$/);
  assert.equal(o[2].selectable, true); assert.equal(o[2].label, "tercero.com (dominio completo)");
});

test("Search Console: con dominio confirmado, solo el que coincide; los demás quedan bloqueados", () => {
  const o = optionsForSearchConsole(gsc, "mi-sitio.com");
  assert.deepEqual(o.map((x) => x.selectable), [false, true, false]);
  assert.equal(o[1].recommended, true);
  assert.match(o[2].reason!, /mi-sitio\.com/);
  // coincide también con sc-domain:
  assert.equal(optionsForSearchConsole(gsc, "tercero.com")[2].selectable, true);
});

test("Search Console: sin dominio confirmado y una sola opción válida, se recomienda", () => {
  const o = optionsForSearchConsole({ siteEntry: [{ permissionLevel: "siteOwner", siteUrl: "https://a.com/" }] }, null);
  assert.equal(o[0].recommended, true);
  assert.equal(optionsForSearchConsole(gsc, null).some((x) => x.recommended), false);
});

test("respuestas vacías o raras no lanzan y no ofrecen nada", () => {
  for (const app of ["google_search_console", "google_analytics", "facebook", "instagram"] as const) {
    for (const bad of [null, undefined, {}, [], "x", 7, { items: [] }, { siteEntry: "no" }]) {
      assert.deepEqual(buildOptions(app, bad, { confirmedDomain: null }), []);
    }
  }
});

test("Analytics: propiedades dentro de las cuentas, con id numérico", () => {
  const o = buildOptions("google_analytics", { accountSummaries: [{ account: "accounts/1", displayName: "Mi cuenta", propertySummaries: [{ property: "properties/1234", displayName: "Sitio web" }, { property: "properties/99", displayName: "App" }] }] }, { confirmedDomain: null });
  assert.deepEqual(o.map((x) => [x.id, x.label, x.detail]), [["1234", "Sitio web", "Mi cuenta · cuenta 1 · propiedad 1234"], ["99", "App", "Mi cuenta · cuenta 1 · propiedad 99"]]);
  assert.equal(o.some((x) => x.recommended), false);
  assert.equal(buildOptions("google_analytics", { account_summaries: [{ display_name: "C", property_summaries: [{ property: "properties/5", display_name: "P" }] }] }, { confirmedDomain: null })[0].id, "5");
});

test("Facebook: solo id y nombre — jamás el token de acceso", () => {
  const o = buildOptions("facebook", { data: [{ id: "111", name: "Mi Página", category: "Inmobiliaria", access_token: "EAAB-SECRETO", tasks: ["MANAGE"] }] }, { confirmedDomain: null });
  assert.equal(o.length, 1);
  assert.equal(o[0].recommended, true);
  assert.equal(o[0].detail, "Inmobiliaria · código de la Página 111");
  assert.ok(!JSON.stringify(o).includes("SECRETO") && !JSON.stringify(o).includes("access_token"));
});

test("Instagram: una cuenta con usuario, sin duplicados", () => {
  const o = buildOptions("instagram", { data: { id: "178", username: "mi_cuenta", name: "Mi Negocio" }, alias: { id: "178", username: "mi_cuenta" } }, { confirmedDomain: null });
  assert.deepEqual(o.map((x) => [x.id, x.label]), [["178", "@mi_cuenta"]]);
  assert.equal(o[0].detail, "Mi Negocio · código de la cuenta 178");
});

test("Analytics: dos cuentas con el MISMO nombre se distinguen por sus números (caso real)", () => {
  const real = { accountSummaries: [
    { account: "accounts/111", displayName: "Seguros de Salud y Vida", name: "accountSummaries/111", propertySummaries: [{ displayName: "Seguros de Salud y Vida", parent: "accounts/111", property: "properties/900", propertyType: "PROPERTY_TYPE_ORDINARY" }] },
    { account: "accounts/222", displayName: "Seguros de Salud y Vida", name: "accountSummaries/222", propertySummaries: [{ displayName: "Seguros de Salud y Vida", parent: "accounts/222", property: "properties/800", propertyType: "PROPERTY_TYPE_ORDINARY" }] },
  ] };
  const o = buildOptions("google_analytics", real, { confirmedDomain: null });
  assert.equal(o.length, 2);
  assert.notEqual(o[0].detail, o[1].detail);
  assert.match(o[0].detail!, /cuenta 111/); assert.match(o[1].detail!, /propiedad 800/);
});

const report = (rows: Array<[string, number]>) => ({ rows: rows.map(([host, n]) => ({ dimensionValues: [{ value: host }], metricValues: [{ value: String(n) }] })) });

test("informe de Analytics: sitios que envían visitas y total de usuarios", () => {
  assert.deepEqual(summarizeAnalyticsReport(report([["www.mi-sitio.com", 120], ["(not set)", 3], ["otro.com", 5]])), { hosts: ["www.mi-sitio.com", "otro.com"], users: 128 });
  assert.deepEqual(summarizeAnalyticsReport({}), { hosts: [], users: 0 });
  assert.deepEqual(summarizeAnalyticsReport(null), { hosts: [], users: 0 });
});

test("Analytics: la propiedad que recibe visitas del dominio confirmado es la recomendada", () => {
  const options = buildOptions("google_analytics", { accountSummaries: [
    { account: "accounts/1", displayName: "Igual", propertySummaries: [{ property: "properties/900", displayName: "Igual" }] },
    { account: "accounts/2", displayName: "Igual", propertySummaries: [{ property: "properties/800", displayName: "Igual" }] } ] }, { confirmedDomain: null });
  const r = applyAnalyticsTraffic(options, { "900": summarizeAnalyticsReport(report([["www.mi-sitio.com", 300]])), "800": summarizeAnalyticsReport(report([])) }, "mi-sitio.com");
  assert.deepEqual(r.map((o) => o.recommended), [true, false]);
  assert.match(r[0].detail!, /recibe visitas de www\.mi-sitio\.com \(300 usuarios/);
  assert.match(r[1].detail!, /sin visitas/);
});

test("Analytics: sin dominio confirmado, se recomienda solo si UNA propiedad tiene tráfico", () => {
  const options = buildOptions("google_analytics", { accountSummaries: [
    { account: "accounts/1", displayName: "A", propertySummaries: [{ property: "properties/1", displayName: "P1" }, { property: "properties/2", displayName: "P2" }] } ] }, { confirmedDomain: null });
  const one = applyAnalyticsTraffic(options, { "1": { hosts: ["x.com"], users: 9 }, "2": { hosts: [], users: 0 } }, null);
  assert.deepEqual(one.map((o) => o.recommended), [true, false]);
  const both = applyAnalyticsTraffic(options, { "1": { hosts: ["x.com"], users: 9 }, "2": { hosts: ["y.com"], users: 4 } }, null);
  assert.equal(both.some((o) => o.recommended), false, "con tráfico en ambas no se adivina");
  const failed = applyAnalyticsTraffic(options, { "1": null, "2": null }, null);
  assert.match(failed[0].detail!, /no se pudo leer/); assert.equal(failed.some((o) => o.recommended), false);
});

test("continuidad: se recomienda lo que la cuenta ya usa hoy, y solo si es elegible", () => {
  const gscOptions = optionsForSearchConsole(gsc, null);
  const r = markCurrentSelection(gscOptions, "https://www.mi-sitio.com");
  assert.deepEqual(r.map((o) => o.recommended), [false, true, false]);
  assert.match(r[1].detail!, /usas hoy/);
  // uno bloqueado no se recomienda aunque sea el actual
  assert.equal(markCurrentSelection(gscOptions, "https://www.otro-sitio.com/").some((o) => o.recommended), false);
  // sin actual, o que no aparece, no cambia nada
  assert.deepEqual(markCurrentSelection(gscOptions, null), gscOptions);
  assert.deepEqual(markCurrentSelection(gscOptions, "https://no-esta.com/"), gscOptions);
});

test("Search Console: el código exacto y el tipo de propiedad identifican cada sitio", () => {
  const o = optionsForSearchConsole({ siteEntry: [
    { permissionLevel: "siteOwner", siteUrl: "sc-domain:ejemplo.com" },
    { permissionLevel: "siteOwner", siteUrl: "https://www.ejemplo.com/" },
    { permissionLevel: "siteOwner", siteUrl: "http://ejemplo.com/" } ] }, null);
  assert.equal(new Set(o.map((x) => x.detail)).size, 3, "tres propiedades parecidas deben verse distintas");
  assert.match(o[0].detail!, /propiedad de dominio · código sc-domain:ejemplo\.com/);
  assert.match(o[1].detail!, /prefijo de URL · código https:\/\/www\.ejemplo\.com\//);
});

test("Search Console: actividad de 28 días por sitio (solo en los elegibles)", () => {
  assert.deepEqual(summarizeSearchConsoleQuery({ rows: [{ clicks: 7, impressions: 120, ctr: 0.05, position: 9 }] }), { clicks: 7, impressions: 120 });
  assert.deepEqual(summarizeSearchConsoleQuery({}), { clicks: 0, impressions: 0 });
  const base = optionsForSearchConsole(gsc, null);
  const r = applySearchConsoleStats(base, { "https://www.mi-sitio.com/": { clicks: 3, impressions: 40 }, "sc-domain:tercero.com": null });
  assert.match(r[1].detail!, /28 días: 3 clics · 40 impresiones/);
  assert.match(r[2].detail!, /no se pudo leer su actividad/);
  assert.equal(r[0].detail, base[0].detail, "un sitio bloqueado no se consulta");
  assert.match(applySearchConsoleStats(base, { "https://www.mi-sitio.com/": { clicks: 0, impressions: 0 } })[1].detail!, /sin actividad/);
});
