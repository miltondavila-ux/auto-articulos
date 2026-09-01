import { prisma } from "@auto-articulos/db";

export type ArticleLimits = {
  monthlyArticleLimit: number | null;
  dailyArticleLimit: number | null;
  maxTitlesPerBatch: number;
};

export async function getEffectiveArticleLimits(user: {
  platformDomain: string;
  monthlyArticleLimitOverride?: number | null;
  dailyArticleLimitOverride?: number | null;
  maxTitlesPerBatchOverride?: number | null;
}): Promise<ArticleLimits> {
  const global = await prisma.articleLimitsConfig.findUnique({
    where: { platformDomain: user.platformDomain },
  });
  return {
    monthlyArticleLimit: user.monthlyArticleLimitOverride ?? global?.monthlyArticleLimit ?? 300,
    dailyArticleLimit: user.dailyArticleLimitOverride ?? global?.dailyArticleLimit ?? 20,
    maxTitlesPerBatch: user.maxTitlesPerBatchOverride ?? global?.maxTitlesPerBatch ?? 20,
  };
}
