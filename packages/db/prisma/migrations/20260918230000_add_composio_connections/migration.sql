-- CONEXION COMPOSIO, Fase 2a (FASE_0_ARQUITECTURA_CONEXION_COMPOSIO.md §6).
-- Solo AÑADE: dos enums y dos tablas nuevas. No modifica ninguna tabla ni
-- columna existente, así que no puede afectar a ninguna cuenta actual.
-- Idempotente: se puede ejecutar varias veces (vía «safe_composio_connections»
-- del workflow «Migración manual», o con `prisma migrate deploy`).

DO $$
BEGIN
  CREATE TYPE "IntegrationRouteMode" AS ENUM ('OWN', 'COMPOSIO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ComposioConnectionStatus" AS ENUM ('INITIATED', 'ACTIVE', 'FAILED', 'REVOKED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "IntegrationRoute" (
  "app" TEXT NOT NULL,
  "route" "IntegrationRouteMode" NOT NULL DEFAULT 'OWN',
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationRoute_pkey" PRIMARY KEY ("app")
);

CREATE TABLE IF NOT EXISTS "ComposioConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "app" TEXT NOT NULL,
  "connectedAccountId" TEXT NOT NULL,
  "status" "ComposioConnectionStatus" NOT NULL DEFAULT 'INITIATED',
  "siteDomain" TEXT NOT NULL DEFAULT '',
  "siteUrl" TEXT,
  "sitemapUrl" TEXT,
  "propertyId" TEXT,
  "pageId" TEXT,
  "pageName" TEXT,
  "igAccountId" TEXT,
  "username" TEXT,
  "lastSitemapSyncAt" TIMESTAMP(3),
  "lastSitemapSyncStatus" TEXT,
  "lastSitemapSyncError" TEXT,
  "activatedAt" TIMESTAMP(3),
  "legacyRevokeAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComposioConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ComposioConnection_connectedAccountId_key"
  ON "ComposioConnection" ("connectedAccountId");

CREATE UNIQUE INDEX IF NOT EXISTS "ComposioConnection_userId_app_siteDomain_key"
  ON "ComposioConnection" ("userId", "app", "siteDomain");

CREATE INDEX IF NOT EXISTS "ComposioConnection_userId_idx"
  ON "ComposioConnection" ("userId");

CREATE INDEX IF NOT EXISTS "ComposioConnection_status_idx"
  ON "ComposioConnection" ("status");

DO $$
BEGIN
  ALTER TABLE "ComposioConnection"
    ADD CONSTRAINT "ComposioConnection_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- RLS sin políticas: estas tablas nunca deben ser accesibles por PostgREST
-- (mismo criterio que el paso «Forzar RLS» del workflow de migración).
ALTER TABLE "IntegrationRoute" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComposioConnection" ENABLE ROW LEVEL SECURITY;
