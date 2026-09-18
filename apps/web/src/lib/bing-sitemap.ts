import { prisma } from "@auto-articulos/db";
import {
  listBingSitemaps,
  submitBingSitemap,
  type BingSite,
} from "@auto-articulos/shared";
import { normalizeDomain } from "@/lib/domain-validation";

export type SitemapCheck = { ok: boolean; reason?: string };

export function pickSiteForDomain(sites: BingSite[], domain: string | null | undefined) {
  const target = normalizeDomain(domain ?? "");
  if (!target) return null;
  return sites.find((site) => normalizeDomain(site.Url) === target) ?? null;
}

export function defaultSitemapUrl(siteUrl: string) {
  try {
    return `${new URL(siteUrl).origin}/sitemap.xml`;
  } catch {
    return `${siteUrl.replace(/\/+$/, "")}/sitemap.xml`;
  }
}

export async function checkSitemapReachable(url: string): Promise<SitemapCheck> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "LASolucionAI-SitemapCheck/1.0" },
    });
    if (!res.ok) return { ok: false, reason: `El sitemap respondió HTTP ${res.status}.` };
    const head = (await res.text()).slice(0, 2000).toLowerCase();
    if (!/<(urlset|sitemapindex)[\s>]/.test(head)) {
      return { ok: false, reason: "La URL responde, pero no parece un sitemap XML válido." };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "No se pudo acceder a la URL del sitemap." };
  }
}

/**
 * Deja el sitio y el sitemap de Bing listos sin intervención del usuario:
 * elige el sitio verificado que coincide con el dominio de la cuenta, toma el
 * sitemap ya registrado en Bing o, si no hay, prueba `/sitemap.xml`; solo lo
 * guarda si realmente responde como XML, y en ese caso lo envía a Bing.
 */
export async function autoConfigureBing(
  integration: {
    id: string;
    siteUrl: string | null;
    sitemapUrl: string | null;
    siteDomain: string;
  },
  accessToken: string,
  sites: BingSite[],
): Promise<{ siteUrl: string | null; sitemapUrl: string | null; sitemapCheck?: SitemapCheck; synced?: boolean }> {
  let siteUrl = integration.siteUrl;
  let sitemapUrl = integration.sitemapUrl;
  if (!siteUrl) {
    const match = pickSiteForDomain(sites, integration.siteDomain);
    if (!match) return { siteUrl: null, sitemapUrl };
    siteUrl = match.Url;
    await prisma.searchIntegration.update({ where: { id: integration.id }, data: { siteUrl } });
  }
  if (sitemapUrl) return { siteUrl, sitemapUrl };

  let candidate: string | null = null;
  try {
    candidate = (await listBingSitemaps(accessToken, siteUrl))[0] ?? null;
  } catch {
    // La detección en Bing es opcional; se prueba la ruta estándar.
  }
  candidate ??= defaultSitemapUrl(siteUrl);
  const sitemapCheck = await checkSitemapReachable(candidate);
  if (!sitemapCheck.ok) return { siteUrl, sitemapUrl: null, sitemapCheck };

  sitemapUrl = candidate;
  let synced = false;
  const data: Record<string, unknown> = { sitemapUrl };
  try {
    await submitBingSitemap(accessToken, siteUrl, sitemapUrl);
    Object.assign(data, { lastSitemapSyncAt: new Date(), lastSitemapSyncStatus: "success", lastSitemapSyncError: null });
    synced = true;
  } catch {
    // Queda guardado; el envío manual o el nocturno lo reintentan.
  }
  await prisma.searchIntegration.update({ where: { id: integration.id }, data });
  return { siteUrl, sitemapUrl, sitemapCheck, synced };
}
