-- Permiso individual y conexión OAuth2 de Tumblr.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allowTumblrPublishing" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "TumblrIntegration" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "blogIdentifier" TEXT NOT NULL,
  "blogTitle" TEXT,
  "accessTokenEncrypted" TEXT NOT NULL,
  "refreshTokenEncrypted" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TumblrIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TumblrIntegration_userId_key" ON "TumblrIntegration"("userId");
DO $$ BEGIN
  ALTER TABLE "TumblrIntegration" ADD CONSTRAINT "TumblrIntegration_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
