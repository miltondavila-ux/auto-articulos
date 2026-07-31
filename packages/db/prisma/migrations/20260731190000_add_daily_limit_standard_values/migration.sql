-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dailyArticleLimit" INTEGER DEFAULT 40;
ALTER TABLE "User" ALTER COLUMN "monthlyArticleLimit" SET DEFAULT 300;

-- Valores estándar pedidos por el usuario (31/7/2026): 300 artículos/mes y
-- 40 artículos/día como límite por defecto para todos los usuarios.
UPDATE "User" SET "monthlyArticleLimit" = 300;
UPDATE "User" SET "dailyArticleLimit" = 40 WHERE "dailyArticleLimit" IS NULL;
