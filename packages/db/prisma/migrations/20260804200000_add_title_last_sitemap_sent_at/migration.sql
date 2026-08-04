-- AlterTable
ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "lastSitemapSentAt" TIMESTAMP(3);
