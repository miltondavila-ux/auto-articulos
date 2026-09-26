import test from "node:test";
import assert from "node:assert/strict";
import { isMigrationApp } from "./composio-access";

test("GSC y GA están abiertas a toda cuenta (incluida la desconexión)", () => {
  assert.equal(isMigrationApp("google_search_console"), true);
  assert.equal(isMigrationApp("google_analytics"), true);
});

test("Facebook, Instagram y valores raros siguen con opt-in", () => {
  assert.equal(isMigrationApp("facebook"), false);
  assert.equal(isMigrationApp("instagram"), false);
  assert.equal(isMigrationApp(undefined), false);
  assert.equal(isMigrationApp(42), false);
});
