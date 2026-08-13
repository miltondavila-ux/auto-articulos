import { prisma } from "@auto-articulos/db";

const updates = [
  ["update-20260810-module", "2026-08-10", "Nuevo módulo de Actualizaciones en el menú", "nuevas-herramientas", "Se agregó una nueva sección en el menú principal donde podrás consultar todos los cambios, mejoras y correcciones realizadas en la plataforma de forma clara y explicada.", "Ejemplo: Si quieres saber qué novedades hay o qué se corrigió recientemente, entras a 'Actualizaciones' y verás cada cambio explicado con un ejemplo sencillo sin tecnicismos."],
  ["update-20260808-social", "2026-08-08", "Sincronización automática de publicaciones con redes sociales (Threads, X y LinkedIn)", "nuevas-herramientas", "Ahora cada vez que publicas un artículo en la plataforma, puedes configurarlo para que se cree automáticamente una publicación optimizada en Threads, X (Twitter) y LinkedIn.", "Ejemplo: Escribes y publicas un artículo sobre '10 consejos para tu negocio'. Automáticamente se publica un resumen atractivo en tu cuenta de Threads y LinkedIn con el enlace hacia tu sitio."],
  ["update-20260805-seo", "2026-08-05", "Sugerencias de oportunidades de contenido SEO", "nuevas-herramientas", "El sistema analiza las búsquedas de tu audiencia en Google e identifica qué temas están buscando los usuarios para sugerirte títulos listos para redactar y publicar.", "Ejemplo: Si muchas personas buscan 'cómo elegir un seguro de auto', la herramienta te alerta en la pestaña 'Oportunidades' y te propone el título exacto para captar esos clientes."],
  ["update-20260803-special-chars", "2026-08-03", "Corrección en caracteres especiales al publicar en redes", "arreglos", "Se corrigió un error que provocaba fallos o caracteres extraños al publicar títulos o textos que contenían acentos, tildes, signos de interrogación o la letra 'ñ'.", "Ejemplo: Antes, al publicar '¿Cómo diseñar tu página web?', el texto podía cortarse o mostrar símbolos extraños. Ahora se publica perfectamente tal cual lo escribes."],
  ["update-20260728-google", "2026-07-28", "Mejora en la reconexión de credenciales de Google Search Console", "arreglos", "Se solucionó un problema por el cual la conexión con Google Search Console se desconectaba periódicamente requiriendo volver a iniciar sesión.", "Ejemplo: Antes tenías que volver a vincular tu cuenta de Google cada pocos días. Ahora la conexión se mantiene estable de forma continua."],
] as const;

async function main() {
  for (const [id, date, title, category, summary, example] of updates) {
    await prisma.productUpdate.upsert({ where: { id }, update: {}, create: { id, date: new Date(`${date}T00:00:00.000Z`), title, category, summary, example } });
  }
  console.log(`ProductUpdate: ${updates.length} entradas históricas verificadas.`);
}

main().finally(() => prisma.$disconnect());
