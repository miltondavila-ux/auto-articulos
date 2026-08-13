-- Control de visibilidad de módulos para el usuario (13/8/2026).
-- Permite al administrador ocultar o habilitar módulos específicos por usuario.
-- IF NOT EXISTS garantiza que no falle si la columna ya fue agregada.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "disabledModules" TEXT;
