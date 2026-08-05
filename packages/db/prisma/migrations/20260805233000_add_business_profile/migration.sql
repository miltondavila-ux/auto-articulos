-- AlterTable
ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "summary" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "BusinessProfileIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "accountName" TEXT,
    "locationName" TEXT,
    "locationTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfileIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessProfileIntegration_userId_key" ON "BusinessProfileIntegration"("userId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "BusinessProfilePost" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "ctaUrl" TEXT NOT NULL,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "googleResponse" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessProfilePost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessProfilePost_titleId_key" ON "BusinessProfilePost"("titleId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "BusinessProfileIntegration" ADD CONSTRAINT "BusinessProfileIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "BusinessProfilePost" ADD CONSTRAINT "BusinessProfilePost_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
