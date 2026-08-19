-- Clusters de intención: capa adicional sobre OpportunityGroup sin cambiar
-- los títulos ni las categorías existentes.
CREATE TABLE "OpportunityCluster" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "rationale" TEXT,
    "primaryIntent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityCluster_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OpportunityTitle"
ADD COLUMN "clusterId" TEXT,
ADD COLUMN "searchIntent" TEXT,
ADD COLUMN "clusterRole" TEXT;

CREATE INDEX "OpportunityCluster_groupId_createdAt_idx"
ON "OpportunityCluster"("groupId", "createdAt");

CREATE INDEX "OpportunityTitle_clusterId_idx"
ON "OpportunityTitle"("clusterId");

ALTER TABLE "OpportunityCluster"
ADD CONSTRAINT "OpportunityCluster_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "OpportunityGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpportunityTitle"
ADD CONSTRAINT "OpportunityTitle_clusterId_fkey"
FOREIGN KEY ("clusterId") REFERENCES "OpportunityCluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
