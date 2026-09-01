CREATE TABLE "ArticleLimitsConfig" (
  "platformDomain" TEXT NOT NULL,
  "monthlyArticleLimit" INTEGER,
  "dailyArticleLimit" INTEGER,
  "maxTitlesPerBatch" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArticleLimitsConfig_pkey" PRIMARY KEY ("platformDomain")
);

ALTER TABLE "User" ADD COLUMN "monthlyArticleLimitOverride" INTEGER;
ALTER TABLE "User" ADD COLUMN "dailyArticleLimitOverride" INTEGER;
ALTER TABLE "User" ADD COLUMN "maxTitlesPerBatchOverride" INTEGER;

INSERT INTO "ArticleLimitsConfig" ("platformDomain", "monthlyArticleLimit", "dailyArticleLimit", "maxTitlesPerBatch", "updatedAt")
SELECT domains.domain,
       COALESCE(current_values."monthlyArticleLimit", 300),
       COALESCE(current_values."dailyArticleLimit", 20),
       COALESCE(current_values."maxTitlesPerBatch", 20),
       CURRENT_TIMESTAMP
FROM (VALUES ('net'), ('site'), ('tagcrush')) AS domains(domain)
LEFT JOIN LATERAL (
  SELECT u."monthlyArticleLimit", u."dailyArticleLimit", u."maxTitlesPerBatch"
  FROM "User" u
  WHERE u."platformDomain" = domains.domain
  ORDER BY CASE WHEN u.role = 'admin' THEN 0 ELSE 1 END, u."createdAt"
  LIMIT 1
) current_values ON TRUE
ON CONFLICT ("platformDomain") DO NOTHING;
