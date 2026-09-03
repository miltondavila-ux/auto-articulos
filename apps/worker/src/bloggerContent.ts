const LINK_TOKEN = "[ENLACE]";

export function escapeBloggerHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/\"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&#39;");
}

function formatLine(line: string, linkHtml: string): string {
  // The copy generator is instructed not to use Markdown. These small
  // cleanups keep an occasional heading/emphasis marker from becoming
  // visible Blogger text without interpreting arbitrary HTML from the model.
  const cleanLine = line
    .replace(/^\s*#{1,6}\s+/, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1");

  return cleanLine
    .split(LINK_TOKEN)
    .map(escapeBloggerHtml)
    .join(linkHtml);
}

/**
 * Convierte el copy adaptado de una oportunidad en HTML editorial breve.
 * Blogger recibe el resumen de la red, no el cuerpo completo del artículo.
 */
export function formatBloggerSummary(suggestedText: string, articleUrl: string): string {
  const baseText = suggestedText.replace(/\r\n?/g, "\n").trim() || LINK_TOKEN;
  const textWithLink = baseText.includes(LINK_TOKEN)
    ? baseText
    : `${baseText}\n\n${LINK_TOKEN}`;
  const safeUrl = escapeBloggerHtml(articleUrl);
  const linkHtml = `<a href="${safeUrl}">Leer el artículo completo</a>`;

  return textWithLink
    .split(/\n{2,}/)
    .map((paragraph) => {
      const lines = paragraph
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length === 0) return "";
      return `<p>${lines.map((line) => formatLine(line, linkHtml)).join("<br />")}</p>`;
    })
    .filter(Boolean)
    .join("");
}
