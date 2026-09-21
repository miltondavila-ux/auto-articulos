-- Add per-user permission for Google Business Profile publication through PostPeer.
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "allowGoogleBusinessPublishing" BOOLEAN NOT NULL DEFAULT false;
