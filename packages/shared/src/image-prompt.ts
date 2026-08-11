const DEFAULT_IMAGE_PROMPT = "Imagen profesional con texto claro y legible centrado, sin salir del borde:";

export function buildImagePrompt(summary: string, customPrompt?: string | null): string {
  const maxLen = 400;
  const base = (customPrompt && customPrompt.trim()) || DEFAULT_IMAGE_PROMPT;
  const prompt = `${base} ${summary}`;
  return prompt.slice(0, maxLen);
}
