-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "monthlyArticleLimit" INTEGER;

-- AlterTable
ALTER TABLE "Run" ADD COLUMN IF NOT EXISTS "disableIndexing" BOOLEAN NOT NULL DEFAULT false;
