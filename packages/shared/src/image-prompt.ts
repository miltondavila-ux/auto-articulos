const DEFAULT_IMAGE_PROMPT = "Crea una imagen hiperrealista donde haya humanos y tomando en cuenta este texto:";

export function buildImagePrompt(summary: string, customPrompt?: string | null): string {
  const maxLen = 590;
  const base = (customPrompt && customPrompt.trim()) || DEFAULT_IMAGE_PROMPT;
  const prompt = `${base} ${summary}`;
  return prompt.slice(0, maxLen);
}
