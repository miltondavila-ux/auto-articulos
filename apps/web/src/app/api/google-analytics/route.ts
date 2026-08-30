import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, getGoogleAnalyticsAccessToken, listGoogleAnalyticsProperties } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";

const PROVIDER = "google-analytics";

export async function GET() {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true } });
  const integration = await prisma.searchIntegration.findFirst({ where: { userId, provider: PROVIDER, ...(user.selectedSiteDomain ? { siteDomain: user.selectedSiteDomain } : {}) } });
  if (!integration?.encryptedRefreshToken) return NextResponse.json({ connected: false, properties: [] });
  try {
    const accessToken = await getGoogleAnalyticsAccessToken(decryptSecret(integration.encryptedRefreshToken));
    const properties = await listGoogleAnalyticsProperties(accessToken);
    return NextResponse.json({ connected: true, propertyId: integration.siteUrl, properties });
  } catch (error) {
    return NextResponse.json({ connected: true, propertyId: integration.siteUrl, properties: [], error: error instanceof Error ? error.message : "No se pudieron consultar las propiedades GA4." });
  }
}

export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true } });
  const body = (await request.json().catch(() => ({}))) as { propertyId?: string };
  if (!body.propertyId?.trim()) return NextResponse.json({ error: "Selecciona una propiedad GA4." }, { status: 400 });
  const integration = await prisma.searchIntegration.findFirst({ where: { userId, provider: PROVIDER, ...(user.selectedSiteDomain ? { siteDomain: user.selectedSiteDomain } : {}) } });
  if (!integration?.encryptedRefreshToken) return NextResponse.json({ error: "Conecta Google Analytics antes de elegir una propiedad." }, { status: 400 });
  const accessToken = await getGoogleAnalyticsAccessToken(decryptSecret(integration.encryptedRefreshToken));
  const properties = await listGoogleAnalyticsProperties(accessToken);
  if (!properties.some((property) => property.propertyId === body.propertyId!.trim())) return NextResponse.json({ error: "La propiedad no pertenece a la cuenta autorizada." }, { status: 403 });
  await prisma.searchIntegration.update({ where: { id: integration.id }, data: { siteUrl: body.propertyId.trim() } });
  return NextResponse.json({ connected: true, propertyId: body.propertyId.trim() });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  await prisma.searchIntegration.deleteMany({ where: { userId, provider: PROVIDER } });
  return NextResponse.json({ connected: false });
}
