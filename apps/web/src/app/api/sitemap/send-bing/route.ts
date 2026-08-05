import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getBingAccessToken,
  submitBingSitemap,
} from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";

/**
 * Envío manual del sitemap a Bing Webmaster Tools — mismo patrón que
 * /api/sitemap/send (Google), para cuando el envío diario automático falló
 * y no se quiere esperar a la próxima corrida.
 */
export async function POST() {
  const userId = await getCurrentUserId();
  const integration = await prisma.searchIntegration.findUnique({
    where: { userId_provider: { userId, provider: "bing" } },
  });
  if (!integration?.siteUrl || !integration.sitemapUrl) {
    return NextResponse.json(
      { error: "Conecta Bing Webmaster Tools y configura el sitemap primero." },
      { status: 400 },
    );
  }

  try {
    const accessToken = await getBingAccessToken(
      decryptSecret(integration.encryptedRefreshToken),
    );
    await submitBingSitemap(
      accessToken,
      integration.siteUrl,
      integration.sitemapUrl,
    );

    const sentAt = new Date();
    await prisma.searchIntegration.update({
      where: { id: integration.id },
      data: {
        lastSitemapSyncAt: sentAt,
        lastSitemapSyncStatus: "success",
        lastSitemapSyncError: null,
      },
    });

    return NextResponse.json({
      ok: true,
      lastSitemapSyncAt: sentAt,
      lastSitemapSyncStatus: "success",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.searchIntegration.update({
      where: { id: integration.id },
      data: {
        lastSitemapSyncAt: new Date(),
        lastSitemapSyncStatus: "error",
        lastSitemapSyncError: message,
      },
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
