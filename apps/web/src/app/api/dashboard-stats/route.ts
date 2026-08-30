import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export async function GET() {
  const userId = await getCurrentUserId();
  const account = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true } });
  const now = new Date();
  const today = startOfDay(now);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysBack = 14;
  const chartStart = new Date(today);
  chartStart.setDate(chartStart.getDate() - (daysBack - 1));

  const [
    user,
    totalPublished,
    totalAttempted,
    publishedThisMonth,
    publishedToday,
    lastPublished,
    recentPublished,
    opportunityGroups,
    integration,
    pendingOpportunityTitles,
  ] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { monthlyArticleLimit: true, dailyArticleLimit: true },
    }),
    prisma.title.count({ where: { run: { userId }, status: "success" } }),
    prisma.title.count({ where: { run: { userId } } }),
    prisma.title.count({
      where: {
        run: { userId },
        status: "success",
        processedAt: { gte: startOfMonth },
      },
    }),
    prisma.title.count({
      where: { run: { userId }, status: "success", processedAt: { gte: today } },
    }),
    prisma.title.findFirst({
      where: { run: { userId }, status: "success" },
      orderBy: { processedAt: "desc" },
      select: { processedAt: true },
    }),
    prisma.title.findMany({
      where: {
        run: { userId },
        status: "success",
        processedAt: { gte: chartStart },
      },
      select: { processedAt: true },
    }),
    prisma.opportunityGroup.findMany({
      where: { userId, ...(account.selectedSiteDomain ? { category: { siteDomain: account.selectedSiteDomain } } : {}) },
      select: {
        impressions: true,
        clicks: true,
        category: { select: { name: true } },
        titles: { select: { id: true } },
      },
      orderBy: { impressions: "desc" },
      take: 5,
    }),
    prisma.searchIntegration.findFirst({
      where: { userId, provider: "google", ...(account.selectedSiteDomain ? { siteDomain: account.selectedSiteDomain } : {}) },
      select: { siteUrl: true, updatedAt: true },
    }),
    prisma.opportunityTitle.count({ where: { group: { userId } } }),
  ]);

  const chartBuckets = new Map<string, number>();
  for (let i = 0; i < daysBack; i++) {
    const d = new Date(chartStart);
    d.setDate(d.getDate() + i);
    chartBuckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const title of recentPublished) {
    if (!title.processedAt) continue;
    const key = startOfDay(title.processedAt).toISOString().slice(0, 10);
    if (chartBuckets.has(key)) {
      chartBuckets.set(key, (chartBuckets.get(key) ?? 0) + 1);
    }
  }
  const chart = Array.from(chartBuckets.entries()).map(([date, count]) => ({
    date,
    label: new Date(date + "T00:00:00").toLocaleDateString("es-US", {
      day: "2-digit",
      month: "2-digit",
    }),
    "Artículos publicados": count,
  }));

  // Racha: días consecutivos con al menos 1 publicación, contando hacia
  // atrás desde hoy (o desde ayer si hoy todavía no se publicó nada).
  let streak = 0;
  const sortedDays = Array.from(chartBuckets.entries()).reverse();
  let startIdx = 0;
  if (sortedDays[0][1] === 0) startIdx = 1;
  for (let i = startIdx; i < sortedDays.length; i++) {
    if (sortedDays[i][1] > 0) streak++;
    else break;
  }

  const daysSinceLastPublish = lastPublished?.processedAt
    ? Math.floor(
        (today.getTime() - startOfDay(lastPublished.processedAt).getTime()) /
          86400000,
      )
    : null;

  const topCategories = opportunityGroups.map((g) => ({
    name: g.category.name,
    impressions: Math.round(g.impressions),
    clicks: Math.round(g.clicks),
    opportunities: g.titles.length,
  }));

  return NextResponse.json({
    totalPublished,
    totalAttempted,
    successRate:
      totalAttempted > 0 ? Math.round((totalPublished / totalAttempted) * 100) : null,
    publishedThisMonth,
    monthlyArticleLimit: user.monthlyArticleLimit,
    publishedToday,
    dailyArticleLimit: user.dailyArticleLimit,
    daysSinceLastPublish,
    streak,
    chart,
    googleConnected: Boolean(integration?.siteUrl),
    googleSiteUrl: integration?.siteUrl ?? null,
    googleLastSync: integration?.updatedAt ?? null,
    topCategories,
    pendingOpportunityTitles,
  });
}
