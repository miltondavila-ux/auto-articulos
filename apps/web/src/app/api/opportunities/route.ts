import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getGoogleAccessToken,
  queryGoogleSearchAnalytics,
} from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { analyzeSeoOpportunities } from "@/lib/opportunity-analysis";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function list(userId: string) {
  return prisma.opportunityGroup.findMany({
    where: { userId },
    orderBy: [{ impressions: "desc" }, { createdAt: "desc" }],
    include: { category: true, titles: { orderBy: { createdAt: "asc" } } },
  });
}

export async function GET() {
  const userId = await getCurrentUserId();
  return NextResponse.json({ groups: await list(userId) });
}

export async function POST() {
  const userId = await getCurrentUserId();
  const integration = await prisma.searchIntegration.findUnique({
    where: { userId_provider: { userId, provider: "google" } },
  });
  if (!integration?.siteUrl) {
    return NextResponse.json(
      { error: "Conecta Google Search Console y elige una propiedad primero." },
      { status: 400 },
    );
  }
  const categories = await prisma.category.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (categories.length === 0) {
    return NextResponse.json(
      { error: "Sincroniza tus categorías de 10minutesWebsite primero." },
      { status: 400 },
    );
  }

  try {
    const end = new Date();
    end.setUTCDate(end.getUTCDate() - 3);
    const currentStart = new Date(end);
    currentStart.setUTCDate(currentStart.getUTCDate() - 27);
    const previousEnd = new Date(currentStart);
    previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setUTCDate(previousStart.getUTCDate() - 27);
    const accessToken = await getGoogleAccessToken(
      decryptSecret(integration.encryptedRefreshToken),
    );
    const [currentRows, previousRows, existing] = await Promise.all([
      queryGoogleSearchAnalytics(
        accessToken,
        integration.siteUrl,
        isoDate(currentStart),
        isoDate(end),
      ),
      queryGoogleSearchAnalytics(
        accessToken,
        integration.siteUrl,
        isoDate(previousStart),
        isoDate(previousEnd),
      ),
      prisma.title.findMany({
        where: {
          run: { userId },
          status: "success",
          articleUrl: { not: null },
        },
        select: { text: true, finalTitle: true },
        orderBy: { processedAt: "desc" },
        take: 1000,
      }),
    ]);
    if (currentRows.length === 0) {
      return NextResponse.json(
        {
          error:
            "Search Console todavía no tiene datos de rendimiento para esta propiedad.",
        },
        { status: 422 },
      );
    }
    const analysis = await analyzeSeoOpportunities({
      categories,
      currentRows,
      previousRows,
      existingTitles: existing.flatMap((title) =>
        title.finalTitle ? [title.text, title.finalTitle] : [title.text],
      ),
    });

    await prisma.$transaction(async (tx) => {
      await tx.opportunityGroup.deleteMany({ where: { userId } });
      for (const group of analysis) {
        await tx.opportunityGroup.create({
          data: {
            userId,
            categoryId: group.categoryId,
            rationale: group.rationale,
            impressions: group.impressions,
            clicks: group.clicks,
            titles: { create: group.titles },
          },
        });
      }
    });
    return NextResponse.json({ groups: await list(userId) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
