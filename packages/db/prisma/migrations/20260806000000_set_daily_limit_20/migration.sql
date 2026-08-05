-- AlterTable: nuevo valor por defecto para cuentas creadas de aquí en adelante
ALTER TABLE "User" ALTER COLUMN "dailyArticleLimit" SET DEFAULT 20;

-- Pedido explícito del usuario, 6/8/2026: bajar el límite diario a 20
-- artículos para TODOS los usuarios existentes.
UPDATE "User" SET "dailyArticleLimit" = 20;
