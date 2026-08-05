-- AlterTable
ALTER TABLE "SearchIntegration" ADD COLUMN IF NOT EXISTS "lastSitemapSyncAt" TIMESTAMP(3);
ALTER TABLE "SearchIntegration" ADD COLUMN IF NOT EXISTS "lastSitemapSyncStatus" TEXT;
ALTER TABLE "SearchIntegration" ADD COLUMN IF NOT EXISTS "lastSitemapSyncError" TEXT;
