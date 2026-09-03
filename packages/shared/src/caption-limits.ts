/**
 * Recorte seguro de captions por red social.
 *
 * Auditoría 31/8/2026 (pedido de Milton): el patrón anterior armaba el
 * texto final como `suggestedText + "\n\n" + articleUrl` y recién ahí lo
 * recortaba al máximo de caracteres de cada red. Eso podía partir el link
 * a la mitad o borrarlo por completo cuando el texto generado por IA ya
 * estaba cerca del límite. Este módulo garantiza que, si hay que recortar,
 * el recorte se aplique SIEMPRE al texto y nunca al enlace del artículo.
 *
 * Límites verificados contra documentación oficial / fuentes primarias
 * (no memoria): Threads 500, X 280 (con URLs contadas como 23 vía t.co),
 * LinkedIn 3000, Pinterest description 500, Tumblr (NPF) 4096 code points,
 * Bluesky 300 "graphemes" (no unidades UTF-16 de JS).
 */

function hasSegmenter(): boolean {
  return typeof Intl !== "undefined" && typeof (Intl as unknown as { Segmenter?: unknown }).Segmenter === "function";
}

/** Cuenta caracteres visibles ("graphemes"), no unidades UTF-16 de JS. */
export function countGraphemes(str: string): number {
  if (hasSegmenter()) {
    const segmenter = new (Intl as unknown as { Segmenter: new (locale: string, opts: { granularity: string }) => { segment(s: string): Iterable<unknown> } }).Segmenter("en", { granularity: "grapheme" });
    let count = 0;
    for (const _ of segmenter.segment(str)) count++;
    return count;
  }
  // Node sin Intl.Segmenter (poco probable en runtimes modernos): al menos
  // contar por code point evita partir un emoji de un solo code point a la
  // mitad, aunque no agrupe emojis compuestos (ZWJ) como un solo grapheme.
  return Array.from(str).length;
}

/** Recorta a N caracteres visibles ("graphemes"), no unidades UTF-16 de JS. */
export function truncateGraphemes(str: string, maxGraphemes: number): string {
  const n = Math.max(0, maxGraphemes);
  if (hasSegmenter()) {
    const segmenter = new (Intl as unknown as { Segmenter: new (locale: string, opts: { granularity: string }) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter("en", { granularity: "grapheme" });
    let out = "";
    let count = 0;
    for (const { segment } of segmenter.segment(str)) {
      if (count >= n) break;
      out += segment;
      count++;
    }
    return out;
  }
  return Array.from(str).slice(0, n).join("");
}

export interface SafeCaptionOptions {
  /** Máximo de caracteres (o graphemes, si useGraphemes) para el texto final completo, INCLUYENDO el enlace. */
  maxChars: number;
  /** Bluesky cuenta por graphemes, no por longitud de string de JS. */
  useGraphemes?: boolean;
  /** X/Twitter cuenta cualquier URL como 23 caracteres fijos (t.co), sin importar su largo real. */
  linkCostOverride?: number;
}

/**
 * Arma el texto final de una publicación insertando el link del artículo
 * (por el placeholder [ENLACE] o agregándolo al final), garantizando que el
 * link SIEMPRE quede completo. Si hace falta recortar, el recorte se aplica
 * solo al texto generado por IA, nunca al enlace.
 */
export function buildSafeCaption(suggestedText: string, articleUrl: string, options: SafeCaptionOptions): string {
  const { maxChars, useGraphemes = false, linkCostOverride } = options;
  const len = (s: string) => (useGraphemes ? countGraphemes(s) : s.length);
  const truncate = (s: string, n: number) => (useGraphemes ? truncateGraphemes(s, n) : s.slice(0, Math.max(0, n)));

  const expanded = suggestedText.includes("[ENLACE]")
    ? suggestedText.replace("[ENLACE]", articleUrl)
    : `${suggestedText}\n\n${articleUrl}`;

  if (len(expanded) <= maxChars) return expanded;

  const linkIndex = expanded.indexOf(articleUrl);
  if (linkIndex === -1) {
    // No debería pasar (el link se acaba de insertar arriba), pero por
    // seguridad no dejamos pasar texto sin recortar.
    return truncate(expanded, maxChars - 3) + "...";
  }

  const before = expanded.slice(0, linkIndex);
  const after = expanded.slice(linkIndex + articleUrl.length);
  const linkCost = linkCostOverride ?? len(articleUrl);
  const budgetForBeforeAndAfter = Math.max(0, maxChars - linkCost);

  // El link casi siempre queda al final (patrón "Leer más: [ENLACE]"), así
  // que `after` normalmente está vacío — pero si no lo está, se recorta
  // primero para no dejar pasar texto de más allá del link.
  const truncatedAfter = len(after) > budgetForBeforeAndAfter ? truncate(after, budgetForBeforeAndAfter) : after;
  const budgetForBefore = Math.max(0, budgetForBeforeAndAfter - len(truncatedAfter));
  const truncatedBefore = len(before) > budgetForBefore
    ? truncate(before, Math.max(0, budgetForBefore - 3)) + "..."
    : before;

  return `${truncatedBefore}${articleUrl}${truncatedAfter}`;
}

/** Recorte simple (sin link embebido) para plataformas donde el enlace va en un campo separado, como Pinterest y Tumblr. */
export function truncatePlainCaption(text: string, maxChars: number): string {
  return text.length > maxChars ? text.slice(0, maxChars - 3) + "..." : text;
}
