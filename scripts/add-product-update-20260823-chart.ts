import { prisma } from "@auto-articulos/db";

const updates = [
  [
    "update-20260823-grafico-ritmo",
    "2026-08-23",
    "Corregido: el gráfico de 'Tu ritmo' en Inicio ya muestra la línea de datos",
    "arreglos",
    "El gráfico 'Tu ritmo — últimos 14 días' de la pantalla de Inicio se veía vacío (sin ninguna línea dibujada) aunque sí tenías artículos publicados. Era un problema de estilos que impedía que los colores del gráfico se generaran correctamente. Ya está corregido.",
    "Entra a Inicio: en la tarjeta 'Tu ritmo — últimos 14 días' ahora sí ves la línea con tus artículos publicados día por día, y la línea punteada de tu meta diaria.",
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
