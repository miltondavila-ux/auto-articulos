-- Migración: Agregar permisos de LinkedIn y Threads
-- Ejecutar en la base de datos de producción

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allowLinkedInPublishing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allowThreadsPublishing" BOOLEAN NOT NULL DEFAULT false;
