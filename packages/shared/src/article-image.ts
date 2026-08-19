/**
 * Obtiene la imagen pública declarada por un artículo para ser compartido.
 * La URL devuelta es absoluta y respeta la URL final después de redirecciones.
 */
export async function getArticleOpenGraphImage(articleUrl: string): Promise<string | null> {
  try {
    const response = await fetch(articleUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: "text/html,application/xhtml+xml" },
    });
    if (!response.ok) return null;

    const html = await response.text();
    const match = html.match(
      /<meta\s+[^>]*(?:property|name)=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    ) ?? html.match(
      /<meta\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["'][^>]*>/i,
    );
    if (!match?.[1]) return null;

    return new URL(match[1].replace(/&amp;/g, "&"), response.url).toString();
  } catch (error) {
    console.warn("No se pudo obtener og:image del artículo:", error);
    return null;
  }
}
