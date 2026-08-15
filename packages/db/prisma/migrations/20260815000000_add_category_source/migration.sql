-- Distingue categorías sincronizadas del sitio real de las agregadas a mano
-- (fallback del wizard). Necesaria para poder reconciliar el sync sin borrar
-- categorías manuales. Filas existentes quedan en "sync" por default: es lo
-- correcto para la enorme mayoría, y así el próximo sync limpia solo la
-- basura acumulada de sesiones viejas (ver categorySync.ts).
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'sync';
