-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "platformDomain" TEXT NOT NULL DEFAULT 'net';
