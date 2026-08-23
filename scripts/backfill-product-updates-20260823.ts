import { prisma } from "@auto-articulos/db";

// Backfill del changelog de usuario (ProductUpdate) para el hueco 10/8 → 23/8.
// Contexto: el módulo /dashboard/actualizaciones existe y ya lee de esta
// tabla, pero la regla de "cada agente agrega su entrada en el mismo commit"
// (acordada el 13/8/2026, ver COORDINACION_CLAUDE_CODEX.md) no se siguió, así
// que el registro se quedó congelado en el 10/8 mientras se publicaban
// decenas de cambios reales — incluyendo cambios de interfaz. Como el bot de
// ayuda (FloatingAssistant) usa este registro como parte de su conocimiento,
// ese vacío significaba que no sabía nada de casi dos semanas de trabajo.
//
// No es un volcado de cada commit (hubo más de 200): son los cambios
// realmente visibles para un usuario final, redactados en su lenguaje, uno
// por capacidad o mejora — igual que las 5 entradas históricas originales.
const updates = [
  [
    "update-20260816-apple-redesign",
    "2026-08-16",
    "Rediseño visual completo, estilo Apple",
    "arreglos",
    "Toda la plataforma cambió de apariencia: fondo blanco limpio, tipografía más fina, colores reducidos al mínimo y botones consistentes en toda pantalla. El objetivo es que sea más fácil de leer y usar, sin quitar ninguna función.",
    "Si entras a cualquier pantalla y la ves distinta a como la recordabas —más blanca, con menos colores y letras más finas—, es este cambio. No se movió ni se quitó ninguna herramienta, solo el aspecto visual.",
    null,
  ],
  [
    "update-20260815-paneles",
    "2026-08-15",
    "Soporte para cuentas con varios sitios (paneles)",
    "nuevas-herramientas",
    "Si tu cuenta maneja más de un sitio bajo el mismo usuario (por ejemplo, versión en Español e Inglés), el sistema ahora detecta cada panel por separado, sincroniza sus categorías correctamente y te deja elegir en cuál publicar.",
    "Al sincronizar categorías o generar oportunidades, si tu cuenta tiene paneles, vas a ver un selector para elegir en cuál trabajar (por ejemplo 'Español' o 'English').",
    "/dashboard/configuracion",
  ],
  [
    "update-20260817-progreso-social",
    "2026-08-17",
    "Progreso en vivo de las publicaciones en redes sociales",
    "nuevas-herramientas",
    "Ahora puedes ver, en tiempo real, en qué etapa va cada publicación que se está enviando a redes sociales (preparando imagen, enviando, confirmando), igual que ya pasaba con los artículos.",
    "En 'Publicaciones en Curso', además de tus artículos vas a ver las publicaciones sociales activas con su porcentaje de avance y la etapa exacta en la que están.",
    "/dashboard/publicaciones-en-curso",
  ],
  [
    "update-20260818-menu-reorg",
    "2026-08-18",
    "Menú principal reorganizado según el flujo de trabajo",
    "arreglos",
    "El menú de la izquierda se reordenó para seguir el orden real en que se usa la plataforma: primero Cómo Funciona, luego Publicaciones (agrupa Publicar y Oportunidades), después Historial, Actualizaciones y Configuración.",
    "Si buscabas 'Publicar' u 'Oportunidades' donde estaban antes y no las encuentras, ahora están juntas dentro de 'Publicaciones', en el menú desplegable.",
    null,
  ],
  [
    "update-20260818-como-funciona",
    "2026-08-18",
    "Nuevo módulo: Cómo Funciona",
    "nuevas-herramientas",
    "Se agregó una pantalla que explica en lenguaje simple qué hace el sistema, qué necesitas configurar y los pasos para publicar y aparecer en Google, Bing y la inteligencia artificial.",
    "Si no sabes por dónde empezar, entra a 'Cómo Funciona' en el menú: te explica el objetivo, los términos técnicos en simple, y el paso a paso completo.",
    "/dashboard/como-funciona",
  ],
  [
    "update-20260818-sync-reliability",
    "2026-08-18",
    "Sincronización de categorías más confiable",
    "arreglos",
    "Se corrigió un error que a veces marcaba la sincronización de categorías como fallida aunque en realidad seguía trabajando y terminaba bien. Ahora, si de verdad termina con éxito, el mensaje de error desaparece.",
    "Si sincronizas tus categorías y ves un mensaje de error que dice 'vuelve a presionar el botón', pero luego notas que tus categorías sí aparecieron, ese mensaje viejo ya no debería volver a aparecer.",
    "/dashboard/configuracion",
  ],
  [
    "update-20260819-cupo-avisos",
    "2026-08-19",
    "Avisos claros cuando llegas al límite diario de artículos",
    "nuevas-herramientas",
    "Al publicar, el sistema ahora avisa con claridad cuántos artículos puedes generar hoy según tu límite, y publica automáticamente los que sí caben en vez de rechazar todo el lote.",
    "Si pides publicar 20 títulos pero tu límite diario es 10, el sistema publica los 10 que caben hoy y te avisa exactamente cuántos quedaron pendientes para mañana.",
    "/dashboard/publicar",
  ],
  [
    "update-20260819-social-connect",
    "2026-08-19",
    "Mismos pasos claros para conectar cualquier red social",
    "arreglos",
    "Conectar Facebook, LinkedIn o Google Business Profile ahora sigue exactamente los mismos pasos explicados, empezando por abrir la red social en otra pestaña antes de pulsar el botón — el paso que más solía fallar.",
    "Antes de conectar cualquier red en Configuración, vas a ver primero la instrucción de abrir esa red en otra pestaña y dejar la sesión iniciada, para que la conexión no falle a mitad de camino.",
    "/dashboard/configuracion",
  ],
  [
    "update-20260819-modulos-admin",
    "2026-08-19",
    "Administración: decidir qué módulos ve cada usuario",
    "nuevas-herramientas",
    "Los administradores ahora pueden activar o desactivar, cuenta por cuenta, a qué módulos tiene acceso cada usuario.",
    "Si una cuenta todavía no debe ver 'Oportunidades para Redes Sociales', un administrador puede desactivárselo desde Administración sin afectar al resto de sus herramientas.",
    "/dashboard/usuarios",
  ],
  [
    "update-20260819-paso1-honesto",
    "2026-08-19",
    "El Paso 1 del asistente ya no dice 'verificado' sin comprobarlo",
    "arreglos",
    "Guardar tus credenciales solo las guarda; antes el asistente las marcaba como 'verificadas' aunque nunca se hubiera comprobado que funcionan de verdad. Ahora solo dice 'verificado' cuando una sincronización real confirmó que el usuario y la contraseña sirven.",
    "En el asistente de configuración, el Paso 1 se queda en 'Pendiente de verificar' hasta que sincronizas tus categorías por primera vez con éxito — ese es el momento en que de verdad se comprueba que tus datos son correctos.",
    "/dashboard",
  ],
  [
    "update-20260820-pinterest-facebook",
    "2026-08-20",
    "Nuevas redes disponibles: Pinterest y Facebook Pages",
    "nuevas-herramientas",
    "Se sumaron Pinterest y Facebook Pages a las redes sociales que el sistema puede conectar y usar para distribuir tus artículos publicados.",
    "En Configuración, dentro de la pestaña de Redes Sociales, ahora puedes conectar también tu cuenta de Pinterest y tu página de Facebook.",
    "/dashboard/configuracion",
  ],
  [
    "update-20260820-ia-imagenes",
    "2026-08-20",
    "Generador de imágenes con inteligencia artificial para redes sociales (piloto)",
    "nuevas-herramientas",
    "Para las publicaciones en Instagram y Facebook, el sistema puede generar automáticamente una imagen nueva con IA (con tu logo incluido), en vez de reutilizar siempre la misma imagen del artículo. Está en fase piloto, disponible para algunas cuentas.",
    "Al publicar en redes sociales, si tu cuenta tiene esta función activa, vas a ver una imagen distinta y diseñada para cada red (formato vertical para Stories, cuadrado para Posts) en vez de la imagen original del artículo recortada.",
    "/dashboard/oportunidades-redes",
  ],
  [
    "update-20260823-comienza-aqui",
    "2026-08-23",
    "Botón 'Comienza aquí' en Inicio, y Cómo Funciona explicado en simple",
    "arreglos",
    "En Inicio, cuando tu cuenta ya está configurada, aparece un botón directo 'Comienza aquí' que te lleva a Oportunidades. Además, la página Cómo Funciona se reescribió para explicar todo en lenguaje simple, sin tecnicismos sin explicar, con un ejemplo al inicio.",
    "Si ya terminaste de configurar tu cuenta, entra a Inicio: vas a ver el botón negro 'Comienza aquí' arriba del panel de rendimiento, listo para llevarte directo a generar oportunidades.",
    "/dashboard",
  ],
  [
    "update-20260823-oportunidades-forzar",
    "2026-08-23",
    "Botón para forzar un nuevo análisis cuando no hay oportunidades nuevas",
    "nuevas-herramientas",
    "Si el último análisis de Oportunidades no encontró nada nuevo, ahora aparece un botón en rojo bien visible para forzar un análisis de todas formas, sin tener que esperar el enfriamiento recomendado.",
    "En Oportunidades, si ves el mensaje de que no se encontraron oportunidades nuevas, debajo aparece el botón rojo 'Analizar de todas formas ahora'.",
    "/dashboard/oportunidades",
  ],
] as const;

async function main() {
  for (const [id, date, title, category, summary, example, modulePath] of updates) {
    await prisma.productUpdate.upsert({
      where: { id },
      update: {},
      create: {
        id,
        date: new Date(`${date}T00:00:00.000Z`),
        title,
        category,
        summary,
        example,
        modulePath: modulePath ?? null,
      },
    });
  }
  console.log(`ProductUpdate: ${updates.length} entradas de backfill (10/8 - 23/8) verificadas.`);
}

main().finally(() => prisma.$disconnect());
