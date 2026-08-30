ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "selectedSiteDomain" TEXT,
  ADD COLUMN IF NOT EXISTS "selectedSitePanel" TEXT,
  ADD COLUMN IF NOT EXISTS "siteSelectionConfirmed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Category"
  ADD COLUMN IF NOT EXISTS "siteDomain" TEXT NOT NULL DEFAULT '';

ALTER TABLE "SearchIntegration"
  ADD COLUMN IF NOT EXISTS "siteDomain" TEXT NOT NULL DEFAULT '';

DROP INDEX IF EXISTS "SearchIntegration_userId_provider_key";
CREATE UNIQUE INDEX IF NOT EXISTS "SearchIntegration_userId_provider_siteDomain_key"
  ON "SearchIntegration" ("userId", "provider", "siteDomain");
