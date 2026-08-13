-- Permisos de publicación por red social (13/8/2026).
-- allowInstagramPublishing ya existía en algunos entornos (se creó a mano),
-- por eso todas las columnas se agregan con IF NOT EXISTS.
-- Sin estas columnas, el PATCH de /api/admin/users falla y el panel de
-- administración no puede guardar los permisos de LinkedIn ni de Threads.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allowInstagramPublishing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allowLinkedInPublishing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allowThreadsPublishing" BOOLEAN NOT NULL DEFAULT false;
