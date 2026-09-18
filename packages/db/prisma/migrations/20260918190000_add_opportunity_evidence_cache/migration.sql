-- Caché aditiva por fuente para reutilizar evidencia SEO sin repetir llamadas
-- a GSC, GA4 y Bing mientras el snapshot siga vigente.
CREATE TABLE "OpportunityEvidenceCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteDomain" TEXT NOT NULL DEFAULT '',
    "panel" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ok',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunityEvidenceCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpportunityEvidenceCache_userId_siteDomain_panel_source_key"
ON "OpportunityEvidenceCache"("userId", "siteDomain", "panel", "source");

CREATE INDEX "OpportunityEvidenceCache_userId_expiresAt_idx"
ON "OpportunityEvidenceCache"("userId", "expiresAt");

ALTER TABLE "OpportunityEvidenceCache"
ADD CONSTRAINT "OpportunityEvidenceCache_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
