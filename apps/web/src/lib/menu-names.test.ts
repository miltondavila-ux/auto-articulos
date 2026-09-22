import { test } from "node:test";
import assert from "node:assert/strict";
import { MENU_LABELS_NUMBERED, MENU_NAMES, MENU_NAMES_ANTERIORES } from "./menu-names";
import { SYSTEM_MODULES } from "./modules";
import { BASE_USER_MANUAL } from "../content/manual-usuario";

test("los tres nombres del menú son los pedidos por Milton", () => {
  assert.equal(MENU_NAMES.propios, "CONTENIDO PROPIO");
  assert.equal(MENU_NAMES.ia, "CONTENIDO GENERADO POR IA");
  assert.equal(MENU_NAMES.redes, "PUBLICA EN REDES SOCIALES Y EN BLOGS PÚBLICOS");
  assert.equal(MENU_LABELS_NUMBERED.propios, "1) CONTENIDO PROPIO");
  assert.equal(MENU_LABELS_NUMBERED.ia, "2) CONTENIDO GENERADO POR IA");
  assert.equal(MENU_LABELS_NUMBERED.redes, "3) PUBLICA EN REDES SOCIALES Y EN BLOGS PÚBLICOS");
});

test("el panel de módulos usa los mismos nombres que el menú", () => {
  const label = (id: string) => SYSTEM_MODULES.find((m) => m.id === id)?.label;
  assert.equal(label("publicar"), MENU_NAMES.propios);
  assert.equal(label("oportunidades"), MENU_NAMES.ia);
  assert.equal(label("oportunidades-redes"), MENU_NAMES.redes);
});

test("el manual (y por tanto el asistente) usa los nombres actuales", () => {
  for (const name of Object.values(MENU_NAMES)) {
    assert.ok(BASE_USER_MANUAL.includes(name), `el manual no menciona «${name}»`);
  }
  assert.ok(BASE_USER_MANUAL.includes(`«1) ${MENU_NAMES.propios}»`));
});

test("el manual solo cita un nombre anterior dentro del párrafo «Nombres anteriores»", () => {
  const [antes, ...resto] = BASE_USER_MANUAL.split("Nombres anteriores:");
  assert.equal(resto.length, 1, "debe haber un único párrafo de nombres anteriores");
  const despues = resto[0].split("\n\n")[0];
  const fuera = antes + resto[0].slice(despues.length);
  for (const viejos of Object.values(MENU_NAMES_ANTERIORES)) {
    // «Publicar» solo es un nombre viejo como etiqueta suelta; se ignora
    // porque también es un verbo y un botón legítimo en el resto del manual.
    for (const viejo of viejos.filter((v) => v !== "Publicar")) {
      assert.equal(fuera.includes(viejo), false, `el manual aún usa el nombre anterior «${viejo}»`);
    }
  }
});
