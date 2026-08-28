ALTER TABLE "User" ADD COLUMN "allowMastodonPublishing" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "MastodonIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instanceUrl" TEXT NOT NULL,
    "username" TEXT,
    "displayName" TEXT,
    "accessTokenEncrypted" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MastodonIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MastodonIntegration_userId_key" ON "MastodonIntegration"("userId");
ALTER TABLE "MastodonIntegration" ADD CONSTRAINT "MastodonIntegration_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
