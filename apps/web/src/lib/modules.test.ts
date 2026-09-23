import { test } from "node:test";
import assert from "node:assert/strict";
import { SYSTEM_MODULES, getEffectiveDisabledModules } from "./modules";

const enabled = (id: string) => JSON.stringify({ [id]: "enabled" });

test("el módulo Conexiones existe, no es opt-in y apunta a su página", () => {
  const mod = SYSTEM_MODULES.find((m) => m.id === "conexion-composio");
  assert.ok(mod);
  assert.equal(mod!.optIn, undefined);
  assert.equal(mod!.href, "/dashboard/configuracion/conexiones");
});

test("Conexiones queda visible para usuarios normales por defecto", () => {
  assert.equal(getEffectiveDisabledModules({ role: "user", disabledModules: null }, []).includes("conexion-composio"), false);
  assert.equal(getEffectiveDisabledModules({ role: "user", disabledModules: "{}" }, []).includes("conexion-composio"), false);
  assert.equal(getEffectiveDisabledModules({ role: "user", disabledModules: JSON.stringify({ "conexion-composio": "inherit" }) }, []).includes("conexion-composio"), false);
  assert.ok(getEffectiveDisabledModules({ role: "user", disabledModules: JSON.stringify({ "conexion-composio": "disabled" }) }, []).includes("conexion-composio"));
});

test("«Habilitado» explícito lo muestra aunque el ocultar global lo incluya", () => {
  assert.equal(getEffectiveDisabledModules({ role: "user", disabledModules: enabled("conexion-composio") }, []).includes("conexion-composio"), false);
  assert.equal(getEffectiveDisabledModules({ role: "user", disabledModules: enabled("conexion-composio") }, ["conexion-composio"]).includes("conexion-composio"), false);
});

test("el resto de módulos se comporta exactamente como antes", () => {
  const normal = SYSTEM_MODULES.filter((m) => !m.optIn).map((m) => m.id);
  // sin overrides ni global: ningún módulo normal queda oculto
  const base = getEffectiveDisabledModules({ role: "user", disabledModules: null }, []);
  for (const id of normal) assert.equal(base.includes(id), false, `${id} no debería estar oculto por defecto`);
  // global y override siguen funcionando
  assert.ok(getEffectiveDisabledModules({ role: "user", disabledModules: null }, ["historial"]).includes("historial"));
  assert.equal(getEffectiveDisabledModules({ role: "user", disabledModules: enabled("historial") }, ["historial"]).includes("historial"), false);
  assert.ok(getEffectiveDisabledModules({ role: "user", disabledModules: JSON.stringify({ publicar: "disabled" }) }, []).includes("publicar"));
  // formato antiguo (array de ids) sigue siendo «deshabilitado»
  assert.ok(getEffectiveDisabledModules({ role: "user", disabledModules: JSON.stringify(["publicar"]) }, []).includes("publicar"));
});

test("los administradores lo ven siempre (lista vacía)", () => {
  assert.deepEqual(getEffectiveDisabledModules({ role: "admin", disabledModules: null }, ["historial", "conexion-composio"]), []);
});

test("no hay módulos opt-in por ahora", () => {
  assert.deepEqual(SYSTEM_MODULES.filter((m) => m.optIn).map((m) => m.id), []);
});
