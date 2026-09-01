export interface ContentLanguageOption {
  value: string;
  text: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  de: "German",
  fr: "French",
  it: "Italian",
  zh: "Mandarin Chinese",
  pt: "Portuguese",
  ro: "Romanian",
  ru: "Russian",
  es: "Spanish",
  en: "English",
};

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function languageBase(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/-/g, "_").split("_")[0];
}

/**
 * Maps the value saved by Auto Artículos to an option that actually exists in
 * the live 10minutesWebsite modal. The remote site uses values such as
 * `en_VI`, while older records may contain `en` or a visible name.
 */
export function resolveContentLanguageOption(
  requestedLanguage: string,
  options: readonly ContentLanguageOption[],
): ContentLanguageOption | null {
  const requested = requestedLanguage.trim();
  if (!requested) return null;

  const exactValue = options.find((option) => option.value === requested);
  if (exactValue) return exactValue;

  const requestedBase = languageBase(requested);
  const sameLanguageCode = options.find(
    (option) => languageBase(option.value) === requestedBase,
  );
  if (sameLanguageCode) return sameLanguageCode;

  const requestedText = normalizeToken(requested);
  return (
    options.find((option) => normalizeToken(option.text) === requestedText) ??
    null
  );
}

/** Human-readable target language for model instructions and audit logs. */
export function describeContentLanguage(language: string): string {
  const base = languageBase(language);
  return LANGUAGE_NAMES[base] ?? language.trim();
}
