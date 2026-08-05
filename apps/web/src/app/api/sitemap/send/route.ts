import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getGoogleAccessToken,
  submitGoogleSitemap,
} from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";

/**
 * Envío manual del sitemap, para cuando el usuario ve que el envío diario
 * automático falló y no quiere esperar a la próxima corrida (pedido
 * explícito del usuario, 5/8/2026) — misma lógica que
 * apps/worker/src/send-daily-sitemaps.ts pero para un solo usuario, al
 * instante, con el resultado devuelto en la respuesta.
 */
export async function POST() {
  const userId = await getCurrentUserId();
  const integration = await prisma.searchIntegration.findUnique({
    where: { userId_provider: { userId, provider: "google" } },
  });
  if (!integration?.siteUrl || !integration.sitemapUrl) {
    return NextResponse.json(
      { error: "Conecta Google Search Console y configura el sitemap primero." },
      { status: 400 },
    );
  }

  try {
    const accessToken = await getGoogleAccessToken(
      decryptSecret(integration.encryptedRefreshToken),
    );
    await submitGoogleSitemap(
      accessToken,
      integration.siteUrl,
      integration.sitemapUrl,
    );

    const sentAt = new Date();
    const publishedTitles = await prisma.title.findMany({
      where: { run: { userId }, status: "success" },
      select: { id: true },
    });
    await prisma.$transaction([
      prisma.searchIntegration.update({
        where: { id: integration.id },
        data: {
          lastSitemapSyncAt: sentAt,
          lastSitemapSyncStatus: "success",
          lastSitemapSyncError: null,
        },
      }),
      ...(publishedTitles.length > 0
        ? [
            prisma.title.updateMany({
              where: { id: { in: publishedTitles.map((t) => t.id) } },
              data: { lastSitemapSentAt: sentAt },
            }),
            prisma.titleEvent.createMany({
              data: publishedTitles.map((t) => ({
                titleId: t.id,
                message: "Sitemap enviado a Google Search Console (envío manual).",
                createdAt: sentAt,
              })),
            }),
          ]
        : []),
    ]);

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
