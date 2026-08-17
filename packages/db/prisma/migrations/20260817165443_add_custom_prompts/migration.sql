/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `SocialOpportunity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProductUpdate" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Run" ADD COLUMN     "promptId" TEXT;

-- AlterTable
ALTER TABLE "SocialOpportunity" DROP COLUMN "imageUrl";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "businessLogoUrl" TEXT,
ADD COLUMN     "defaultPromptId" TEXT,
ADD COLUMN     "imagePrompt" TEXT,
ADD COLUMN     "infographicPrompt" TEXT,
ADD COLUMN     "profilePhotoUrl" TEXT;

-- CreateTable
CREATE TABLE "ThreadsIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadsUserId" TEXT NOT NULL,
    "threadsUsername" TEXT,
    "accessTokenEncrypted" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreadsIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwitterIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "twitterUserId" TEXT NOT NULL,
    "twitterUsername" TEXT,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwitterIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkedInIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "linkedinUserId" TEXT NOT NULL,
    "linkedinUsername" TEXT,
    "accessTokenEncrypted" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkedInIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instagramBusinessAccountId" TEXT NOT NULL,
    "instagramUsername" TEXT,
    "accessTokenEncrypted" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThreadsIntegration_userId_key" ON "ThreadsIntegration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TwitterIntegration_userId_key" ON "TwitterIntegration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LinkedInIntegration_userId_key" ON "LinkedInIntegration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramIntegration_userId_key" ON "InstagramIntegration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Prompt_name_key" ON "Prompt"("name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultPromptId_fkey" FOREIGN KEY ("defaultPromptId") REFERENCES "Prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadsIntegration" ADD CONSTRAINT "ThreadsIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwitterIntegration" ADD CONSTRAINT "TwitterIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkedInIntegration" ADD CONSTRAINT "LinkedInIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramIntegration" ADD CONSTRAINT "InstagramIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
