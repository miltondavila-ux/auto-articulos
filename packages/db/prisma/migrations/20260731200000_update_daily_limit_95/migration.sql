-- Cambio de valor estándar pedido por el usuario (31/7/2026): límite diario
-- de artículos pasa de 40 a 95 para todos los usuarios.
ALTER TABLE "User" ALTER COLUMN "dailyArticleLimit" SET DEFAULT 95;
UPDATE "User" SET "dailyArticleLimit" = 95;
