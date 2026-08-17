CREATE TABLE "FacebookPageIntegration" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "facebookPageId" TEXT NOT NULL,
  "facebookPageName" TEXT,
  "accessTokenEncrypted" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FacebookPageIntegration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FacebookPageIntegration_userId_key" ON "FacebookPageIntegration"("userId");
ALTER TABLE "FacebookPageIntegration" ADD CONSTRAINT "FacebookPageIntegration_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
