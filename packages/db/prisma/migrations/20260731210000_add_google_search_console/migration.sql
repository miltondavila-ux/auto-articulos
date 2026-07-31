-- CreateTable
CREATE TABLE "SearchIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "siteUrl" TEXT,
    "sitemapUrl" TEXT,
    "permissionLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchIntegration_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Title"
ADD COLUMN "googleIndexingStatus" TEXT,
ADD COLUMN "googleIndexingMessage" TEXT,
ADD COLUMN "googleIndexingAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "SearchIntegration_userId_provider_key"
ON "SearchIntegration"("userId", "provider");

CREATE INDEX "SearchIntegration_userId_idx" ON "SearchIntegration"("userId");

ALTER TABLE "SearchIntegration"
ADD CONSTRAINT "SearchIntegration_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
