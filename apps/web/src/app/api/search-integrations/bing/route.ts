import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getBingAccessToken,
  listBingSites,
} from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";

async function integrationFor(userId: string) {
  return prisma.searchIntegration.findUnique({
    where: { userId_provider: { userId, provider: "bing" } },
  });
}

export async function GET() {
  const userId = await getCurrentUserId();
  const integration = await integrationFor(userId);
  if (!integration) return NextResponse.json({ connected: false, sites: [] });
  try {
    const accessToken = await getBingAccessToken(
      decryptSecret(integration.encryptedRefreshToken),
    );
    const sites = await listBingSites(accessToken);
    return NextResponse.json({
      connected: true,
      siteUrl: integration.siteUrl,
      sitemapUrl: integration.sitemapUrl,
      sites,
      lastSitemapSyncAt: integration.lastSitemapSyncAt,
      lastSitemapSyncStatus: integration.lastSitemapSyncStatus,
      lastSitemapSyncError: integration.lastSitemapSyncError,
    });
  } catch (error) {
    return NextResponse.json({
      connected: true,
      siteUrl: integration.siteUrl,
      sitemapUrl: integration.sitemapUrl,
      sites: [],
      error: error instanceof Error ? error.message : String(error),
      lastSitemapSyncAt: integration.lastSitemapSyncAt,
      lastSitemapSyncStatus: integration.lastSitemapSyncStatus,
      lastSitemapSyncError: integration.lastSitemapSyncError,
    });
  }
}

export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId();
  const { siteUrl, sitemapUrl } = await request.json();
  if (typeof siteUrl !== "string" || typeof sitemapUrl !== "string") {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  const integration = await integrationFor(userId);
  if (!integration)
    return NextResponse.json(
      { error: "Bing Webmaster Tools no está conectado." },
      { status: 404 },
    );
  const accessToken = await getBingAccessToken(
    decryptSecret(integration.encryptedRefreshToken),
  );
  const sites = await listBingSites(accessToken);
  const selected = sites.find((site) => site.Url === siteUrl);
  if (!selected)
    return NextResponse.json(
      { error: "El sitio no pertenece a esta cuenta." },
      { status: 403 },
    );
  await prisma.searchIntegration.update({
    where: { id: integration.id },
    data: { siteUrl, sitemapUrl: sitemapUrl.trim() },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  await prisma.searchIntegration.deleteMany({
    where: { userId, provider: "bing" },
  });
  return NextResponse.json({ ok: true });
}
