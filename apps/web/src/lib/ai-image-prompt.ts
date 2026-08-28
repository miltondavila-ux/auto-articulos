import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";

// Prompt global (no por usuario) del generador de imágenes con IA para
// redes sociales — pedido explícito de Milton (20/8/2026): tras varias
// rondas de ida y vuelta ajustando el texto del prompt en el chat, quiere
// poder editarlo él mismo desde el panel de administración, sin depender
// de un redeploy de código cada vez. Reutiliza SystemSetting (mismo patrón
// que apps/web/src/lib/modules.ts) en vez de agregar una tabla nueva.
export const AI_IMAGE_PROMPT_KEY = "ai_social_image_prompt";

export async function getAiSocialImagePrompt(): Promise<string | null> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: AI_IMAGE_PROMPT_KEY } });
  if (!setting?.encryptedValue) return null;
  try {
    return decryptSecret(setting.encryptedValue);
  } catch {
    return setting.encryptedValue;
  }
}

export async function setAiSocialImagePrompt(prompt: string): Promise<void> {
  const encryptedValue = encryptSecret(prompt);
  await prisma.systemSetting.upsert({
    where: { key: AI_IMAGE_PROMPT_KEY },
    create: { key: AI_IMAGE_PROMPT_KEY, encryptedValue },
    update: { encryptedValue },
  });
}
