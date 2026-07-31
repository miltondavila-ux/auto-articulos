-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "workerBusyUntil" TIMESTAMP(3);
