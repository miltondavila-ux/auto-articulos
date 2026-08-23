import { prisma } from "@auto-articulos/db";

const updates = [
  [
    "update-20260823-paleta-dashboard",
    "2026-08-23",
    "Corregido: colores del panel de Inicio ahora sí siguen el estilo Apple",
    "arreglos",
    "Al corregir que el gráfico 'Tu ritmo' mostrara datos, aparecieron por primera vez colores genéricos (azul, verde, ámbar, rojo) que no coincidían con el resto de la plataforma. Se ajustaron para usar los mismos colores ya usados en toda la app.",
    "En Inicio, las tarjetas de estado, la barra de progreso y el aviso superior ahora usan el mismo azul, verde, ámbar y rojo que ves en el resto del sistema (por ejemplo, en Configuración), no colores distintos.",
    "/dashboard",
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
  console.log(`ProductUpdate: ${updates.length} entrada(s) agregada(s).`);
}

main().finally(() => prisma.$disconnect());
