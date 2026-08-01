CREATE TABLE "OpportunityGroup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "rationale" TEXT,
    "impressions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clicks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpportunityGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpportunityTitle" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpportunityTitle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpportunityGroup_userId_categoryId_key" ON "OpportunityGroup"("userId", "categoryId");
CREATE INDEX "OpportunityGroup_userId_createdAt_idx" ON "OpportunityGroup"("userId", "createdAt");
CREATE INDEX "OpportunityTitle_groupId_idx" ON "OpportunityTitle"("groupId");

ALTER TABLE "OpportunityGroup" ADD CONSTRAINT "OpportunityGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpportunityGroup" ADD CONSTRAINT "OpportunityGroup_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpportunityTitle" ADD CONSTRAINT "OpportunityTitle_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OpportunityGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
