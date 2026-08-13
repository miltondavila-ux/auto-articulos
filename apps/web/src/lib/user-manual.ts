import { prisma } from "@auto-articulos/db";
import { BASE_USER_MANUAL } from "@/content/manual-usuario";

type ManualUpdate = {
  date: Date;
  title: string;
  category: string;
  summary: string;
  example: string;
  modulePath: string | null;
};

const MAX_UPDATES_IN_CONTEXT = 100;

/**
 * Construye la parte viva del manual para el asistente. La fuente es la misma
 * que ve el usuario en Actualizaciones: no hay un segundo texto que mantener.
 *
 * Este texto no contiene datos de cuentas, credenciales ni detalles técnicos.
 * El chat debe usarlo como conocimiento verificable y reconocer cuando la
 * respuesta no aparece aquí ni en su manual base.
 */
export async function getCurrentProductKnowledge(): Promise<string> {
  const updates = await prisma.productUpdate.findMany({
    select: {
      date: true,
      title: true,
      category: true,
      summary: true,
      example: true,
      modulePath: true,
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: MAX_UPDATES_IN_CONTEXT,
  });

  return serializeProductKnowledge(updates);
}

/** Manual completo: funcionamiento estable + novedades y arreglos recientes. */
export async function getUserManualKnowledge(): Promise<string> {
  const liveKnowledge = await getCurrentProductKnowledge();
  return [
    "MANUAL BASE DE USO",
    BASE_USER_MANUAL,
    "REGISTRO VIVO (información más reciente)",
    liveKnowledge,
  ].join("\n\n====================\n\n");
}

/** Exportada para pruebas sin requerir una conexión a la base de datos. */
export function serializeProductKnowledge(updates: ManualUpdate[]): string {
  if (updates.length === 0) {
    return "REGISTRO DE ACTUALIZACIONES: todavía no hay entradas disponibles.";
  }

  const entries = updates.map((update) => {
    const date = update.date.toISOString().slice(0, 10);
    const module = update.modulePath
      ? `\nMódulo para el usuario: ${update.modulePath}`
      : "";
    return `Fecha: ${date}\nTipo: ${update.category}\nTítulo: ${update.title}\nQué cambió: ${update.summary}\nEjemplo: ${update.example}${module}`;
  });

  return [
    "REGISTRO VIVO DE ACTUALIZACIONES DEL PRODUCTO",
    "Usa exclusivamente estos hechos para explicar novedades o arreglos.",
    "Cuando una entrada incluya 'Módulo para el usuario', dirige a la persona a esa ruta.",
    "No inventes funciones ni enlaces que no aparezcan aquí.",
    entries.join("\n\n---\n\n"),
  ].join("\n\n");
}
