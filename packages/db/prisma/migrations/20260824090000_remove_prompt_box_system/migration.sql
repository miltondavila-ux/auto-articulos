-- Retira el experimento de las ocho cajas y su selector por usuario.
-- Se conservan las migraciones históricas; esta migración elimina sus
-- objetos de producción de forma explícita y ordenada.
DROP TABLE IF EXISTS "PromptBoxExecution";
DROP TABLE IF EXISTS "PromptBox";
DROP TABLE IF EXISTS "CreativeGenerationHistory";

ALTER TABLE "User" DROP COLUMN IF EXISTS "usePromptBoxPipeline";
