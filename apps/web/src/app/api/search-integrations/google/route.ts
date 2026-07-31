import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getGoogleAccessToken,
  listGoogleSearchConsoleSites,
} from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";

async function integrationFor(userId: string) {
  return prisma.searchIntegration.findUnique({
    where: { userId_provider: { userId, provider: "google" } },
  });
}

export async function GET() {
  const userId = await getCurrentUserId();
  const integration = await integrationFor(userId);
  if (!integration) return NextResponse.json({ connected: false, sites: [] });
  try {
    const accessToken = await getGoogleAccessToken(
      decryptSecret(integration.encryptedRefreshToken),
    );
    const sites = await listGoogleSearchConsoleSites(accessToken);
    return NextResponse.json({
      connected: true,
      siteUrl: integration.siteUrl,
      sitemapUrl: integration.sitemapUrl,
      sites,
    });
  } catch (error) {
    return NextResponse.json({
      connected: true,
      siteUrl: integration.siteUrl,
      sitemapUrl: integration.sitemapUrl,
      sites: [],
      error: error instanceof Error ? error.message : String(error),
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
      { error: "Google no está conectado." },
      { status: 404 },
    );
  const accessToken = await getGoogleAccessToken(
    decryptSecret(integration.encryptedRefreshToken),
  );
  const sites = await listGoogleSearchConsoleSites(accessToken);
  const selected = sites.find((site) => site.siteUrl === siteUrl);
  if (!selected)
    return NextResponse.json(
      { error: "La propiedad no pertenece a esta cuenta." },
      { status: 403 },
    );
  await prisma.searchIntegration.update({
    where: { id: integration.id },
    data: {
      siteUrl,
      sitemapUrl: sitemapUrl.trim(),
      permissionLevel: selected.permissionLevel,
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  await prisma.searchIntegration.deleteMany({
    where: { userId, provider: "google" },
  });
  return NextResponse.json({ ok: true });
}
