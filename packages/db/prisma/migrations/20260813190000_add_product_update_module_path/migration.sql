-- Enlace directo desde cada actualización al módulo correspondiente.
ALTER TABLE "ProductUpdate" ADD COLUMN IF NOT EXISTS "modulePath" TEXT;
