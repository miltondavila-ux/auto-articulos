import { headers } from "next/headers";
import { prisma } from "@auto-articulos/db";

/** Solo válido dentro de rutas protegidas por proxy.ts */
export async function getCurrentUserId(): Promise<string> {
  const headerList = await headers();
  const userId = headerList.get("x-user-id");
  if (!userId) {
    throw new Error("getCurrentUserId() llamado fuera de una ruta protegida.");
  }
  return userId;
}

export async function getCurrentUser() {
  const userId = await getCurrentUserId();
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      role: true,
      maxTitlesPerBatch: true,
      contentLanguage: true,
      articleSignature: true,
      allowInstagramPublishing: true,
      allowLinkedInPublishing: true,
      allowThreadsPublishing: true,
      profilePhotoUrl: true,
      businessLogoUrl: true,
      opportunitiesDisclosureAcceptedAt: true,
      phone: true,
      imagePrompt: true,
      infographicPrompt: true,
      createdAt: true,
    },
  });
}

export function displayName(user: {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  if (user.name) return user.name;
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(" ");
  }
  return user.email;
}

/** Lanza si el usuario actual no es admin. Usar en rutas/páginas de administración. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    throw new Error("Se requiere rol de administrador.");
  }
  return user;
}

/**
 * Si un admin está "actuando como" otro usuario (ver proxy.ts), devuelve los
 * datos básicos de ese admin real — independiente del rol del usuario
 * efectivo, para que el botón de "volver a mi cuenta" siga disponible aunque
 * el usuario suplantado no sea admin.
 */
export async function getActingAdmin() {
  const headerList = await headers();
  const adminId = headerList.get("x-acting-admin-id");
  if (!adminId) return null;
  return prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, name: true, firstName: true, lastName: true, email: true },
  });
}

/** Usuario efectivo (el que ve la app) más, si aplica, el admin real detrás. */
export async function getSessionContext() {
  const [user, actingAdmin] = await Promise.all([
    getCurrentUser(),
    getActingAdmin(),
  ]);
  return { user, actingAdmin };
}
