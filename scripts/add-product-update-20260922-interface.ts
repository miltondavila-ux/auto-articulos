import { prisma } from "@auto-articulos/db";

/**
 * Registro coordinado de los cambios visibles de interfaz del 22/09/2026.
 *
 * La página /dashboard/actualizaciones y el asistente de ayuda leen el mismo
 * modelo ProductUpdate. Este script es idempotente: puede ejecutarse de nuevo
 * sin duplicar estas entradas.
 */
const updates = [
  {
    id: "update-20260922-home-three-actions",
    date: "2026-09-22",
    title: "Inicio simplificado con tres acciones principales",
    category: "nuevas-herramientas",
    summary:
      "Después de completar la configuración inicial, Inicio muestra únicamente tres tarjetas: CONTENIDO PROPIO, CONTENIDO GENERADO POR IA y PUBLICA EN REDES SOCIALES Y EN BLOGS PÚBLICOS.",
    example:
      "Para empezar, entra en Inicio y elige una de las tres tarjetas. En móvil aparecen en una sola columna para facilitar el uso.",
    modulePath: "/dashboard",
  },
  {
    id: "update-20260922-mobile-navigation",
    date: "2026-09-22",
    title: "Navegación móvil concentrada en el menú de hamburguesa",
    category: "arreglos",
    summary:
      "En teléfonos y tabletas, la navegación se concentra en el menú de hamburguesa de la esquina superior derecha. Publicaciones contiene los módulos de publicación, progreso, historial y estadísticas; Configuración contiene la ayuda y los ajustes.",
    example:
      "Pulsa el menú de hamburguesa para abrir Publicaciones, Configuración o Cerrar sesión sin ocupar espacio permanente en la pantalla.",
    modulePath: "/dashboard",
  },
  {
    id: "update-20260922-responsive-spacing",
    date: "2026-09-22",
    title: "Espaciado y esquinas estandarizados en la interfaz",
    category: "arreglos",
    summary:
      "Se unificaron los márgenes laterales, paddings principales y esquinas de seis píxeles en las pantallas del sistema, manteniendo la información y priorizando una lectura sencilla en móvil.",
    example:
      "Las secciones principales de Configuración, Publicaciones y los módulos de oportunidades comienzan con el mismo eje lateral y se adaptan al ancho del dispositivo.",
    modulePath: "/dashboard/configuracion/contenido",
  },
  {
    id: "update-20260922-help-knowledge-sync",
    date: "2026-09-22",
    title: "Actualizaciones conectadas al manual del asistente",
    category: "arreglos",
    summary:
      "El registro de Actualizaciones y el manual base se combinan en cada consulta del asistente. Las novedades visibles se documentan en ProductUpdate y el robot recibe automáticamente la información más reciente junto con el catálogo vigente de módulos.",
    example:
      "Cuando se registra una mejora con su ruta interna, el asistente puede explicar qué cambió y dirigir a la persona al módulo exacto sin inventar enlaces.",
    modulePath: "/dashboard/actualizaciones",
  },
] as const;

async function main() {
  for (const update of updates) {
    await prisma.productUpdate.upsert({
      where: { id: update.id },
      update: {
        date: new Date(update.date + "T00:00:00.000Z"),
        title: update.title,
        category: update.category,
        summary: update.summary,
        example: update.example,
        modulePath: update.modulePath,
      },
      create: {
        id: update.id,
        date: new Date(update.date + "T00:00:00.000Z"),
        title: update.title,
        category: update.category,
        summary: update.summary,
        example: update.example,
        modulePath: update.modulePath,
      },
    });
  }
  console.log("ProductUpdate: " + updates.length + " entradas sincronizadas.");
}

main().finally(() => prisma.$disconnect());
