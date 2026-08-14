import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getGoogleAccessToken,
  listGoogleSearchConsoleSites,
  listGoogleSitemaps,
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

    // Pedido explícito del usuario (1/8/2026): no obligar a nadie a
    // escribir a mano la URL de su sitemap — si ya hay una propiedad
    // elegida pero todavía no se guardó un sitemap, se le pregunta a
    // Google directamente cuáles ya conoce para ese sitio y se guarda
    // solo. Si Google no falla pero tampoco tiene ninguno registrado, se
    // deja como estaba (el campo sigue siendo editable a mano como
    // respaldo).
    let sitemapUrl = integration.sitemapUrl;
    if (!sitemapUrl && integration.siteUrl) {
      try {
        const detected = await listGoogleSitemaps(
          accessToken,
          integration.siteUrl,
        );
        if (detected.length > 0) {
          sitemapUrl = detected[0];
          await prisma.searchIntegration.update({
            where: { id: integration.id },
            data: { sitemapUrl },
          });
        }
      } catch {
        // No bloquear la carga de la página si falla la detección
        // automática — el usuario todavía puede escribirlo a mano.
      }
    }

    return NextResponse.json({
      connected: true,
      siteUrl: integration.siteUrl,
      sitemapUrl,
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
  if (typeof siteUrl !== "string" || !siteUrl.trim()) {
    return NextResponse.json({ error: "Datos inválidos: siteUrl es requerido." }, { status: 400 });
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
  const sites = await listGoogleSearchConsoleSites(accessToken).catch(() => []);
  const cleanSiteUrl = siteUrl.trim();
  const selected = sites.find(
    (site) =>
      site.siteUrl === cleanSiteUrl ||
      site.siteUrl.replace(/\/$/, "") === cleanSiteUrl.replace(/\/$/, "") ||
      site.siteUrl === `sc-domain:${cleanSiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`,
  );
  const permissionLevel = selected ? selected.permissionLevel : "siteOwner";

  let finalSitemapUrl =
    typeof sitemapUrl === "string" ? sitemapUrl.trim() : (integration.sitemapUrl ?? "");
  if (!finalSitemapUrl && cleanSiteUrl) {
    try {
      const detected = await listGoogleSitemaps(accessToken, cleanSiteUrl);
      if (detected.length > 0) {
        finalSitemapUrl = detected[0];
      }
    } catch {
      // no bloquear
    }
  }

  await prisma.searchIntegration.update({
    where: { id: integration.id },
    data: {
      siteUrl: cleanSiteUrl,
      sitemapUrl: finalSitemapUrl,
      permissionLevel,
    },
  });
  return NextResponse.json({ ok: true, sitemapUrl: finalSitemapUrl });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  await prisma.searchIntegration.deleteMany({
    where: { userId, provider: "google" },
  });
  return NextResponse.json({ ok: true });
}
