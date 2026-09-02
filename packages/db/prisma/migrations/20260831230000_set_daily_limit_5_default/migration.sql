-- AlterTable: nuevo valor por defecto para cuentas creadas de aquí en adelante
-- (por ejemplo, registro de prueba gratuita, que no fija este campo
-- explícitamente y hasta ahora heredaba 20).
--
-- Pedido explícito de Milton (31/8/2026): que el límite diario de 5
-- artículos, ya aplicado a los usuarios existentes no-admin vía
-- apps/worker/src/set-daily-limit.ts, sea consistente en todo el sistema —
-- incluidas las cuentas nuevas. No se actualizan filas existentes aquí:
-- ya quedaron correctas (5 para no-admin, sin tocar admin) por ese script.
ALTER TABLE "User" ALTER COLUMN "dailyArticleLimit" SET DEFAULT 5;
