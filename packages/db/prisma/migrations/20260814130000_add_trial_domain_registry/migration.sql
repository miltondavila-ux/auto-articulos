-- CreateTable
CREATE TABLE IF NOT EXISTS "TrialDomainRegistry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "normalizedDomain" TEXT,
    "accountUsername" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrialDomainRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrialDomainRegistry_userId_idx" ON "TrialDomainRegistry"("userId");
CREATE INDEX IF NOT EXISTS "TrialDomainRegistry_normalizedDomain_idx" ON "TrialDomainRegistry"("normalizedDomain");
CREATE INDEX IF NOT EXISTS "TrialDomainRegistry_accountUsername_idx" ON "TrialDomainRegistry"("accountUsername");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TrialDomainRegistry_userId_fkey'
    ) THEN
        ALTER TABLE "TrialDomainRegistry" ADD CONSTRAINT "TrialDomainRegistry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
