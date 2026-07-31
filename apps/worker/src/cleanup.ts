import { prisma } from "@auto-articulos/db";

// El usuario pidió explícitamente (31/7/2026) mantener la base lo más
// liviana posible: el log completo (con capturas de diagnóstico en base64)
// solo sirve para depurar justo después de que algo pasa. Pasados unos
// días ya no hace falta guardarlo — el título conserva el resumen
// (status, articleUrl/finalTitle, errorMessage) sin necesidad del log
// paso a paso. No se toca el contenido del artículo en sí: nunca se guardó
// en la base (solo título, resumen corto y enlace).
const EVENT_RETENTION_DAYS = 7;

export async function cleanupOldEvents(): Promise<number> {
  const cutoff = new Date(
    Date.now() - EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const { count } = await prisma.titleEvent.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      title: { status: { notIn: ["pending", "processing"] } },
    },
  });
  return count;
}
