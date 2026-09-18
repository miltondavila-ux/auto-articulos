import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";

// PROMPT PUBLICACIONES PROPIAS — prompt maestro global (no por usuario) con el
// que la IA del sistema crea títulos en Publicaciones propias. Lo escribe y
// edita SOLO el administrador (Administración → Prompts); los usuarios nunca
// lo ven. Mismo patrón que lib/ai-image-prompt.ts: reutiliza SystemSetting en
// vez de agregar una tabla, así que guardar o cambiar el prompt no requiere
// migración.
export const TITLE_GENERATION_PROMPT_KEY = "title_generation_prompt";

// Tope de seguridad del texto del prompt (evita pegar por error un documento
// entero; el prompt viaja completo en cada solicitud a la IA).
export const TITLE_GENERATION_PROMPT_MAX_LENGTH = 20000;

/** null = el administrador todavía no lo configuró (la función queda desactivada). */
export async function getTitleGenerationPrompt(): Promise<string | null> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: TITLE_GENERATION_PROMPT_KEY },
  });
  if (!setting?.encryptedValue) return null;
  let value: string;
  try {
    value = decryptSecret(setting.encryptedValue);
  } catch {
    value = setting.encryptedValue;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function setTitleGenerationPrompt(prompt: string): Promise<void> {
  const encryptedValue = encryptSecret(prompt);
  await prisma.systemSetting.upsert({
    where: { key: TITLE_GENERATION_PROMPT_KEY },
    create: { key: TITLE_GENERATION_PROMPT_KEY, encryptedValue },
    update: { encryptedValue },
  });
}
