/**
 * Enlace público a una publicación, a partir de la red y del id guardado.
 * Devuelve null si no se puede armar un enlace real: en ese caso no se muestra
 * el botón (nunca se enlaza a «#»).
 */
export function socialPostUrl(platform: string, postId: string | null | undefined): string | null {
  const id = (postId ?? "").trim();
  if (!id) return null;
  if (/^https?:\/\//i.test(id)) return id;
  const encoded = encodeURIComponent(id);
  switch (platform) {
    case "threads":
      return `https://www.threads.net/t/${encoded}`;
    case "x":
      return `https://x.com/i/status/${encoded}`;
    case "linkedin":
      return `https://www.linkedin.com/feed/update/${encoded}`;
    case "facebook":
    case "facebook-page":
      // El id de una publicación de Página tiene la forma «idPagina_idPublicacion».
      return `https://www.facebook.com/${encoded}`;
    default:
      return null;
  }
}
