-- Idioma por lote: el idioma pasa a ser una propiedad del artículo y no solo
-- del usuario (pedido explícito del usuario, 7/8/2026). NULL significa "usar
-- el idioma configurado del usuario", que es exactamente el comportamiento
-- que tenían todas las corridas hasta ahora — por eso la columna es opcional
-- y sin default: no cambia nada para las corridas existentes.
ALTER TABLE "Run" ADD COLUMN "contentLanguage" TEXT;
