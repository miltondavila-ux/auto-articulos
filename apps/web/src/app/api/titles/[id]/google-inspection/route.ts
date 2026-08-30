import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getGoogleAccessToken,
  inspectGoogleUrl,
} from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";

async function contextFor(userId: string, titleId: string) {
  const title = await prisma.title.findFirst({
    where: { id: titleId, run: { userId } },
    select: { id: true, articleUrl: true },
  });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true } });
  const integration = await prisma.searchIntegration.findFirst({
    where: { userId, provider: "google", ...(user.selectedSiteDomain ? { siteDomain: user.selectedSiteDomain } : {}) },
  });
  return { title, integration };
}

function searchConsoleUrl(siteUrl: string, articleUrl: string) {
  const url = new URL("https://search.google.com/search-console/inspect");
  url.searchParams.set("resource_id", siteUrl);
  url.searchParams.set("id", articleUrl);
  return url;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const { title, integration } = await contextFor(userId, id);
  if (!title?.articleUrl || !integration?.siteUrl) {
    return NextResponse.redirect(
      new URL("https://search.google.com/search-console"),
    );
  }
  return NextResponse.redirect(
    searchConsoleUrl(integration.siteUrl, title.articleUrl),
  );
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const { title, integration } = await contextFor(userId, id);
  if (!title?.articleUrl) {
    return NextResponse.json(
      { error: "El artículo no tiene URL." },
      { status: 400 },
    );
  }
  if (!integration?.siteUrl) {
    return NextResponse.json(
      { error: "Selecciona primero una propiedad de Google Search Console." },
      { status: 400 },
    );
  }
  try {
    const token = await getGoogleAccessToken(
      decryptSecret(integration.encryptedRefreshToken),
    );
    const inspection = await inspectGoogleUrl(
      token,
      integration.siteUrl,
      title.articleUrl,
    );
    const indexed = inspection.verdict === "PASS";
    const message = indexed
      ? `Google informa que la URL está indexada${inspection.coverageState ? `: ${inspection.coverageState}` : "."}`
      : `Google todavía no reporta la URL como indexada${inspection.coverageState ? `: ${inspection.coverageState}` : "."}`;
    const updated = await prisma.title.update({
      where: { id: title.id },
      data: {
        googleIndexingStatus: indexed ? "indexed" : "inspection_pending",
        googleIndexingMessage: message,
        googleIndexingAt: new Date(),
      },
      select: {
        googleIndexingStatus: true,
        googleIndexingMessage: true,
        googleIndexingAt: true,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
