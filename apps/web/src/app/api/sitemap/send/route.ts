import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import {
  composioSubmitSitemap,
  decryptSecret,
  getGoogleAccessToken,
  submitGoogleSitemap,
} from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { resolveSearchConsoleForUser } from "@/lib/composio-search-console-consumer";

function defaultSitemapUrl(siteUrl: string): string {
  try {
    const url = new URL(siteUrl.startsWith("sc-domain:") ? `https://${siteUrl.replace(/^sc-domain:/, "")}` : siteUrl);
    return `${url.origin.replace(/\/$/, "")}/sitemap.xml`;
  } catch {
    return `${siteUrl.replace(/\/$/, "")}/sitemap.xml`;
  }
}

/**
 * Envío manual del sitemap, para cuando el usuario ve que el envío diario
 * automático falló y no quiere esperar a la próxima corrida (pedido
 * explícito del usuario, 5/8/2026) — misma lógica que
 * apps/worker/src/send-daily-sitemaps.ts pero para un solo usuario, al
 * instante, con el resultado devuelto en la respuesta.
 */
export async function POST() {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true } });
  const integration = await prisma.searchIntegration.findFirst({
    where: { userId, provider: "google", ...(user.selectedSiteDomain ? { siteDomain: user.selectedSiteDomain } : {}) },
  });
  const resolved = await resolveSearchConsoleForUser(userId, user.selectedSiteDomain ?? "");
  const composioSiteUrl = resolved.source === "COMPOSIO" ? resolved.state.composio?.siteUrl ?? null : null;
  const sitemapUrl = integration?.sitemapUrl ?? (composioSiteUrl ? defaultSitemapUrl(composioSiteUrl) : null);
  if ((!integration?.siteUrl && !composioSiteUrl) || !sitemapUrl) {
    return NextResponse.json(
      { error: "Conecta Google Search Console y configura el sitemap primero." },
      { status: 400 },
    );
  }

  try {
    if (resolved.source === "COMPOSIO") {
      if (!resolved.apiKey || !resolved.state.composio?.connectedAccountId || !resolved.state.composio.siteUrl) {
        throw new Error("Search Console requiere reconectar la cuenta por Composio y seleccionar un sitio.");
      }
      await composioSubmitSitemap(
        { apiKey: resolved.apiKey, userId, connectedAccountId: resolved.state.composio.connectedAccountId },
        resolved.state.composio.siteUrl,
        sitemapUrl,
      );
    } else {
      if (!integration?.encryptedRefreshToken || !integration.siteUrl) {
        throw new Error("Conecta Google Search Console y selecciona un sitio primero.");
      }
      const accessToken = await getGoogleAccessToken(decryptSecret(integration.encryptedRefreshToken));
      await submitGoogleSitemap(accessToken, integration.siteUrl, sitemapUrl);
    }

    const sentAt = new Date();
    const publishedTitles = await prisma.title.findMany({
      where: { run: { userId }, status: "success" },
      select: { id: true },
    });
    await prisma.$transaction([
      ...(integration
        ? [
            prisma.searchIntegration.update({
              where: { id: integration.id },
              data: {
                lastSitemapSyncAt: sentAt,
                lastSitemapSyncStatus: "success",
                lastSitemapSyncError: null,
              },
            }),
          ]
        : []),
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
    if (integration) {
      await prisma.searchIntegration.update({
        where: { id: integration.id },
        data: {
          lastSitemapSyncAt: new Date(),
          lastSitemapSyncStatus: "error",
          lastSitemapSyncError: message,
        },
      });
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
