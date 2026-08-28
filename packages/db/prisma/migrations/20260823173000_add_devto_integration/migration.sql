ALTER TABLE "User" ADD COLUMN "allowDevToPublishing" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "DevToIntegration" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "username" TEXT,
  "encryptedApiKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DevToIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DevToIntegration_userId_key" ON "DevToIntegration"("userId");

ALTER TABLE "DevToIntegration"
  ADD CONSTRAINT "DevToIntegration_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
