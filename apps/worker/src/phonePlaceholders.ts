export type PhonePlaceholderResult = {
  html: string;
  replacements: { whatsapp: number; call: number; other: number };
};

/** Normaliza también marcadores que llegaron codificados dentro de una URL. */
export function normalizePhonePlaceholders(html: string): string {
  return html.replace(
    /(?:\{|%(?:25)?7B)(?:TELEFONO|PHONE_NUMBER|NUMERO-WHATSAPP)(?:\}|%(?:25)?7D)/gi,
    "PHONE_NUMBER",
  );
}

/** WhatsApp requires digits only; telephone links keep the leading +. */
export function replacePhonePlaceholders(
  html: string,
  phone: string,
): PhonePlaceholderResult {
  const digits = phone.replace(/\D/g, "");
  if (!digits) throw new Error("El teléfono no contiene dígitos válidos.");

  const international = `+${digits}`;
  const replacements = { whatsapp: 0, call: 0, other: 0 };
  let result = normalizePhonePlaceholders(html);
  const phoneToken = `(?:PHONE_NUMBER|NUMERO-WHATSAPP|(?:\\+|%2B)?${digits})`;

  // Algunos generadores de enlaces de WhatsApp producen /resolve/?deeplink=
  // con el número embebido. Convertirlo a wa.me evita dejar una URL que
  // WhatsApp no puede resolver y conserva un enlace directo y estable.
  result = result.replace(
    new RegExp(
      `https?:\\/\\/api\\.whatsapp\\.com\\/resolve\\/\\?[^"'<>\\s]*?(?:%2F|\\/)${phoneToken}`,
      "gi",
    ),
    () => {
      replacements.whatsapp++;
      return `https://wa.me/${digits}`;
    },
  );

  // Incluye enlaces directos y enlaces anidados dentro de un generador de QR.
  result = result.replace(
    new RegExp(
      `(wa\\.me(?:/|%2F)|(?:api\\.)?whatsapp\\.com[^"'<>\\s]*?(?:phone=|phone%3D)|whatsapp:(?://)?send\\?phone=)${phoneToken}`,
      "gi",
    ),
    (_match, prefix: string) => {
      replacements.whatsapp++;
      return `${prefix}${digits}`;
    },
  );

  result = result.replace(
    new RegExp(`(tel:|tel%3A)${phoneToken}`, "gi"),
    (_match, prefix: string) => {
      replacements.call++;
      return prefix.toLowerCase() === "tel%3a"
        ? `${prefix}%2B${digits}`
        : `${prefix}${international}`;
    },
  );

  result = result.replace(/PHONE_NUMBER/g, () => {
    replacements.other++;
    return international;
  });

  return { html: result, replacements };
}
