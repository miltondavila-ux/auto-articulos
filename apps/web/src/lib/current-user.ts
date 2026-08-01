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
      role: true,
      maxTitlesPerBatch: true,
      createdAt: true,
    },
  });
}

/** Lanza si el usuario actual no es admin. Usar en rutas/páginas de administración. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    throw new Error("Se requiere rol de administrador.");
  }
  return user;
}
