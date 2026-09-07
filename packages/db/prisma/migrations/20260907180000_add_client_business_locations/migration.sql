ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "clientLocations" TEXT,
  ADD COLUMN IF NOT EXISTS "businessLocations" TEXT;
