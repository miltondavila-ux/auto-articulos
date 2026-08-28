import { prisma } from "@auto-articulos/db";

async function main() {
  await prisma.productUpdate.upsert({
    where: { id: "update-20260823-complete-social-guides" },
    update: {},
    create: {
      id: "update-20260823-complete-social-guides",
      date: new Date("2026-08-23T00:00:00.000Z"),
      title: "Guías completas para conectar todas tus redes sociales",
      category: "nuevas-herramientas",
      summary: "Cada red social ahora explica dónde crear la cuenta, cómo recuperar el acceso, qué credencial copiar, qué permiso solicitar y cómo resolver los errores más comunes.",
      example: "En Configuración encontrarás una guía propia para Threads, Instagram, Facebook, LinkedIn, X, Pinterest, Tumblr, Bluesky, Mastodon y DEV.to. El manual y el asistente de ayuda también conocen estos pasos.",
      modulePath: "/dashboard/configuracion?tab=social",
      sourceCommit: "complete-social-guides-20260823",
    },
  });
  console.log("ProductUpdate: guía completa de redes agregada.");
}

main().finally(() => prisma.$disconnect());
