import { test } from "node:test";
import assert from "node:assert/strict";
import { hasSocialPublishingApproval } from "./social-access";

test("oculta difusión para un usuario sin aprobaciones de redes o blogs", () => {
  assert.equal(
    hasSocialPublishingApproval({ role: "user" }),
    false,
  );
});

test("muestra difusión cuando Administración aprueba una red o blog", () => {
  assert.equal(
    hasSocialPublishingApproval({ role: "user", allowBloggerPublishing: true }),
    true,
  );
});

test("los administradores conservan acceso para soporte", () => {
  assert.equal(
    hasSocialPublishingApproval({ role: "admin" }),
    true,
  );
});
