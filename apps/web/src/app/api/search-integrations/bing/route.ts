import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { listBingSites } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getBingTokenForIntegration } from "@/lib/bing-token";
import { autoConfigureBing, checkSitemapReachable, defaultSitemapUrl, type SitemapCheck } from "@/lib/bing-sitemap";
import { validateAndRegisterTrialDomain } from "@/lib/domain-validation";

async function integrationFor(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true } });
  return prisma.searchIntegration.findFirst({ where: { userId, provider: "bing", ...(user.selectedSiteDomain ? { siteDomain: user.selectedSiteDomain } : {}) } });
}

export async function GET() {
  const userId = await getCurrentUserId();
  const integration = await integrationFor(userId);
  if (!integration) return NextResponse.json({ connected: false, sites: [] });
  try {
    const accessToken = await getBingTokenForIntegration(integration);
    const sites = await listBingSites(accessToken);

    let siteUrl = integration.siteUrl;
    let sitemapUrl = integration.sitemapUrl;
    let sitemapCheck: SitemapCheck | undefined;
    let syncedNow = false;
    if (!siteUrl || !sitemapUrl) {
      try {
        const auto = await autoConfigureBing(integration, accessToken, sites);
        siteUrl = auto.siteUrl;
        sitemapUrl = auto.sitemapUrl;
        sitemapCheck = auto.sitemapCheck;
        syncedNow = !!auto.synced;
      } catch {
        // No bloquear la carga: el usuario aún puede elegirlo a mano.
      }
    } else {
      sitemapCheck = await checkSitemapReachable(sitemapUrl, siteUrl);
    }

    return NextResponse.json({
      connected: true,
      siteUrl,
      sitemapUrl,
      sitemapCheck,
      sites,
      lastSitemapSyncAt: syncedNow ? new Date() : integration.lastSitemapSyncAt,
      lastSitemapSyncStatus: syncedNow ? "success" : integration.lastSitemapSyncStatus,
      lastSitemapSyncError: syncedNow ? null : integration.lastSitemapSyncError,
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

  // Validación antifraude de trials: impide que cuentas de prueba reutilicen dominios previos
  const domainValidation = await validateAndRegisterTrialDomain(userId, siteUrl);
  if (!domainValidation.ok) {
    return NextResponse.json({ error: domainValidation.error }, { status: 400 });
  }

  const integration = await integrationFor(userId);
  if (!integration)
    return NextResponse.json(
      { error: "Bing Webmaster Tools no está conectado." },
      { status: 404 },
    );
  // Bug real encontrado el 11/8/2026 (cuenta de Julio Paso): a diferencia de
  // GET y de /api/bing/master-index, este PATCH no tenía try/catch alrededor
  // de las llamadas a Bing — cualquier falla real de la API (token vencido
  // otra vez, error del lado de Bing, etc.) producía una excepción cruda sin
  // JSON, y el frontend caía siempre en el texto genérico "No se pudo
  // guardar", sin mostrar nunca la causa real.
  try {
    const accessToken = await getBingTokenForIntegration(integration);
    const sites = await listBingSites(accessToken);
    const selected = sites.find((site) => site.Url === siteUrl);
    if (!selected)
      return NextResponse.json(
        { error: "El sitio no pertenece a esta cuenta." },
        { status: 403 },
      );
    const finalSitemapUrl = sitemapUrl.trim() || defaultSitemapUrl(siteUrl);
    const sitemapCheck = await checkSitemapReachable(finalSitemapUrl, siteUrl);
    // Con sitemap escrito a mano se guarda igual (puede estar tras un
    // firewall); con el autocompletado solo si realmente responde.
    const keep = sitemapUrl.trim() ? finalSitemapUrl : sitemapCheck.ok ? finalSitemapUrl : "";
    await prisma.searchIntegration.update({
      where: { id: integration.id },
      data: { siteUrl, sitemapUrl: keep },
    });
    return NextResponse.json({ ok: true, sitemapUrl: keep, sitemapCheck });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar el sitio de Bing.",
      },
      { status: 502 },
    );
  }
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  await prisma.searchIntegration.deleteMany({
    where: { userId, provider: "bing" },
  });
  return NextResponse.json({ ok: true });
}
