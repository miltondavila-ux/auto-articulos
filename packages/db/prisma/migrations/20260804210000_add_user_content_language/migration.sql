-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "contentLanguage" TEXT NOT NULL DEFAULT 'es';
