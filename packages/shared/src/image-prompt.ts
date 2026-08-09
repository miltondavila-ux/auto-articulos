export function buildImagePrompt(summary: string): string {
  const maxLen = 590;
  const prompt = `Crea una imagen hiperrealista donde haya humanos y tomando en cuenta este texto: ${summary}`;
  return prompt.slice(0, maxLen);
}
