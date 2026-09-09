-- Fix production login failure introduced by the MCP publication schema.
-- Safe for existing accounts: every existing user keeps the current BROWSER path.
DO $$
BEGIN
  CREATE TYPE "PublishMethod" AS ENUM ('BROWSER', 'MCP');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "publishMethod" "PublishMethod" NOT NULL DEFAULT 'BROWSER';

CREATE TABLE IF NOT EXISTS "McpConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "accessTokenEncrypted" TEXT NOT NULL,
  "refreshTokenEncrypted" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "scope" TEXT,
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "McpConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "McpConnection_userId_provider_key"
  ON "McpConnection" ("userId", "provider");

CREATE INDEX IF NOT EXISTS "McpConnection_userId_idx"
  ON "McpConnection" ("userId");

DO $$
BEGIN
  ALTER TABLE "McpConnection"
    ADD CONSTRAINT "McpConnection_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
