ALTER TABLE "User" ADD COLUMN "allowBlueskyPublishing" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "BlueskyIntegration" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "handle" TEXT NOT NULL,
  "encryptedAppPassword" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlueskyIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BlueskyIntegration_userId_key" ON "BlueskyIntegration"("userId");

ALTER TABLE "BlueskyIntegration"
  ADD CONSTRAINT "BlueskyIntegration_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
