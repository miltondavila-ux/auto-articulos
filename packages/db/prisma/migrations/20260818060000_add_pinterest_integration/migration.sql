CREATE TABLE "PinterestIntegration" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "pinterestUserId" TEXT,
  "accessTokenEncrypted" TEXT NOT NULL,
  "refreshTokenEncrypted" TEXT,
  "expiresAt" TIMESTAMP(3),
  "boardId" TEXT,
  "boardName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PinterestIntegration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PinterestIntegration_userId_key" ON "PinterestIntegration"("userId");
ALTER TABLE "PinterestIntegration" ADD CONSTRAINT "PinterestIntegration_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
