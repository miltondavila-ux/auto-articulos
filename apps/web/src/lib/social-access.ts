import { prisma } from "@auto-articulos/db";

// El módulo de redes está reservado al equipo autorizado: administradores y
// la cuenta operativa de Lorena. La comprobación se repite en API, no solo UI.
export const LORENA_SOCIAL_EMAIL = "lorenalvarez30@gmail.com";

export async function canUseSocialModule(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  return user?.role === "admin" || user?.email.toLowerCase() === LORENA_SOCIAL_EMAIL;
}
