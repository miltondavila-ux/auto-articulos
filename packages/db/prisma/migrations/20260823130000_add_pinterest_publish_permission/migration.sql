-- Permiso individual para conectar y publicar en Pinterest.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allowPinterestPublishing" BOOLEAN NOT NULL DEFAULT false;
