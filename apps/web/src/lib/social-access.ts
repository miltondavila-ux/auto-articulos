import { prisma } from "@auto-articulos/db";
import { getEffectiveDisabledModules, getGlobalDisabledModules } from "@/lib/modules";

/**
 * ¿Puede esta cuenta usar el módulo de redes sociales?
 *
 * Antes esto era `role === "admin" || email === "<un correo concreto>"`. Por
 * eso el administrador no podía dárselo a nadie más: podía marcarlo en
 * Administración y no servía de nada, porque tanto la interfaz como la API
 * seguían mirando ese correo.
 *
 * Ahora sale del permiso real de la cuenta, el mismo que se edita en
 * Administración → Acceso a módulos: si `oportunidades-redes` no está entre sus
 * módulos deshabilitados, tiene acceso. Los administradores siempre lo tienen,
 * para poder dar soporte.
 */
export async function canUseSocialModule(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, disabledModules: true },
  });
  if (!user) return false;
  if (user.role === "admin") return true;

  const globalDisabled = await getGlobalDisabledModules();
  const deshabilitados = getEffectiveDisabledModules(user, globalDisabled);
  return !deshabilitados.includes("oportunidades-redes");
}

export type SocialPublishNetwork = "instagram" | "linkedin" | "threads" | "facebook" | "pinterest";

/** Permiso individual de la red; los administradores siempre tienen acceso. */
export async function canPublishToNetwork(
  userId: string,
  network: SocialPublishNetwork,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      allowInstagramPublishing: true,
      allowLinkedInPublishing: true,
      allowThreadsPublishing: true,
      allowFacebookPublishing: true,
      allowPinterestPublishing: true,
    },
  });
  if (!user) return false;
  if (user.role === "admin") return true;
  const permissions: Record<SocialPublishNetwork, boolean> = {
    instagram: user.allowInstagramPublishing,
    linkedin: user.allowLinkedInPublishing,
    threads: user.allowThreadsPublishing,
    facebook: user.allowFacebookPublishing,
    pinterest: user.allowPinterestPublishing,
  };
  return permissions[network];
}
