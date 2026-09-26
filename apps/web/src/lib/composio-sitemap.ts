/** Utilidades puras del sitemap de Search Console (sin red, fáciles de probar). */

export function defaultSitemapUrl(siteUrl: string): string {
  try {
    const url = new URL(siteUrl.startsWith("sc-domain:") ? `https://${siteUrl.replace(/^sc-domain:/, "")}` : siteUrl);
    return `${url.origin.replace(/\/$/, "")}/sitemap.xml`;
  } catch {
    return `${siteUrl.replace(/\/$/, "")}/sitemap.xml`;
  }
}

function normalize(url: string): string {
  return url.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

/** ¿Google ya tiene ese sitemap? Ignora http/https, «www.» y la barra final. */
export function isSitemapListed(listed: string[], sitemapUrl: string): boolean {
  const wanted = normalize(sitemapUrl);
  return listed.some((path) => normalize(path) === wanted);
}

export type SitemapOutcome = { status: "ALREADY" | "SENT" | "FAILED"; url: string };

export function sitemapMessage(outcome: SitemapOutcome | null | undefined): string | null {
  if (!outcome) return null;
  if (outcome.status === "ALREADY") return `Tu sitemap (${outcome.url}) ya estaba en Google. No hizo falta enviarlo de nuevo.`;
  if (outcome.status === "SENT") return `Enviamos tu sitemap (${outcome.url}) a Google.`;
  return "No pudimos enviar tu sitemap ahora. No te preocupes: se enviará automáticamente en el envío diario.";
}
