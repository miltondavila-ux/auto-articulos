-- Soporte para cuentas con varios "paneles" bajo un solo login (ej. tagcrush:
-- English/Español). "" = cuenta sin esta función, comportamiento sin cambios.
-- No nullable a propósito: Prisma/Postgres no tratan NULL como "igual" de
-- forma confiable dentro de una clave única compuesta.
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "panel" TEXT NOT NULL DEFAULT '';

DROP INDEX IF EXISTS "Category_userId_platform_externalId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Category_userId_platform_panel_externalId_key"
  ON "Category"("userId", "platform", "panel", "externalId");
