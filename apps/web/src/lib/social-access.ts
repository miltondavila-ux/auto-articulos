import { prisma } from "@auto-articulos/db";

/**
 * ¿Puede esta cuenta usar el módulo de redes sociales?
 *
 * Antes la interfaz y la API consultaban reglas distintas, incluida una
 * excepción fija para un correo. Ahora sale de las aprobaciones reales de
 * Administración: al menos una red o blog debe estar marcado para la cuenta.
 * Los administradores siempre lo tienen, para poder dar soporte.
 */
export async function canUseSocialModule(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      allowInstagramPublishing: true,
      allowFacebookPublishing: true,
      allowLinkedInPublishing: true,
      allowThreadsPublishing: true,
      allowPinterestPublishing: true,
      allowTumblrPublishing: true,
      allowBlueskyPublishing: true,
      allowDevToPublishing: true,
      allowBloggerPublishing: true,
      allowGoogleBusinessPublishing: true,
    },
  });
  if (!user) return false;
  return hasSocialPublishingApproval(user);
}

export type SocialPublishNetwork = "instagram" | "linkedin" | "threads" | "facebook" | "pinterest" | "tumblr" | "bluesky" | "devto" | "blogger";

/** Campos que Administración controla para autorizar difusión social/blog. */
export const SOCIAL_PUBLISHING_PERMISSION_KEYS = [
  "allowInstagramPublishing",
  "allowFacebookPublishing",
  "allowLinkedInPublishing",
  "allowThreadsPublishing",
  "allowPinterestPublishing",
  "allowTumblrPublishing",
  "allowBlueskyPublishing",
  "allowDevToPublishing",
  "allowBloggerPublishing",
  "allowGoogleBusinessPublishing",
] as const;

export type SocialPublishingPermissionUser = {
  role?: string | null;
} & Partial<Record<(typeof SOCIAL_PUBLISHING_PERMISSION_KEYS)[number], boolean | null>>;

/**
 * Regla única para mostrar y usar el módulo de difusión.
 * Un usuario regular necesita al menos una aprobación explícita del panel de
 * Administración. La conexión OAuth por sí sola nunca concede acceso.
 */
export function hasSocialPublishingApproval(user: SocialPublishingPermissionUser): boolean {
  if (user.role === "admin") return true;
  return SOCIAL_PUBLISHING_PERMISSION_KEYS.some((key) => user[key] === true);
}

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
      allowTumblrPublishing: true,
      allowBlueskyPublishing: true,
      allowDevToPublishing: true,
      allowBloggerPublishing: true,
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
    tumblr: user.allowTumblrPublishing,
    bluesky: user.allowBlueskyPublishing,
    devto: user.allowDevToPublishing,
    blogger: user.allowBloggerPublishing,
  };
  return permissions[network];
}
