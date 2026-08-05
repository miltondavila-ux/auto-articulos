-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastOpportunityAnalysisAt" TIMESTAMP(3);
