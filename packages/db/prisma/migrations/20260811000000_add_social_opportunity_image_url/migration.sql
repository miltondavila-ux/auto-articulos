-- Create table if it doesn't exist (it was created via db push but missing from migration files)
CREATE TABLE IF NOT EXISTS "SocialOpportunity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titleId" TEXT,
    "articleUrl" TEXT NOT NULL,
    "articleTitle" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "suggestedText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "postId" TEXT,
    "errorLog" TEXT,
    "skipReason" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "SocialOpportunity_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys if they do not exist
-- In PostgreSQL we can't easily do ADD CONSTRAINT IF NOT EXISTS, but we can do it in a DO block to prevent errors if already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'SocialOpportunity_userId_fkey') THEN
        ALTER TABLE "SocialOpportunity" ADD CONSTRAINT "SocialOpportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'SocialOpportunity_titleId_fkey') THEN
        ALTER TABLE "SocialOpportunity" ADD CONSTRAINT "SocialOpportunity_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add column if it doesn't exist
ALTER TABLE "SocialOpportunity" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
