import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { listBingSites } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getBingTokenForIntegration } from "@/lib/bing-token";
import { NOT_CONNECTED, runConnectionTest } from "@/lib/connection-test-route";

export const dynamic = "force-dynamic";

/** Probar conexión de Bing: consulta de solo lectura de los sitios de la cuenta. */
export async function POST() {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true } });
  const integration = await prisma.searchIntegration.findFirst({
    where: { userId, provider: "bing", ...(user.selectedSiteDomain ? { siteDomain: user.selectedSiteDomain } : {}) },
  });
  if (!integration) return NextResponse.json({ error: NOT_CONNECTED }, { status: 400 });
  return runConnectionTest("bing", async () => {
    const accessToken = await getBingTokenForIntegration(integration);
    await listBingSites(accessToken);
    return integration.siteUrl ?? null;
  });
}
