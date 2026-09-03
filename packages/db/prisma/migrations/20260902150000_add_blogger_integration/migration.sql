ALTER TABLE "User" ADD COLUMN "allowBloggerPublishing" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "BloggerIntegration" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bloggerUserId" TEXT,
  "blogId" TEXT NOT NULL,
  "blogName" TEXT,
  "accessTokenEncrypted" TEXT NOT NULL,
  "refreshTokenEncrypted" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BloggerIntegration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BloggerIntegration_userId_key" ON "BloggerIntegration"("userId");
ALTER TABLE "BloggerIntegration" ADD CONSTRAINT "BloggerIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
