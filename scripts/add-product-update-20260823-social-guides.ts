import { prisma } from "@auto-articulos/db";

async function main() {
  await prisma.productUpdate.upsert({
    where: { id: "update-20260823-social-guides" },
    update: {},
    create: {
      id: "update-20260823-social-guides",
      date: new Date("2026-08-23T00:00:00.000Z"),
      title: "Nuevas instrucciones paso a paso para conectar tus redes sociales",
      category: "nuevas-herramientas",
      summary: "Configuración ahora explica con palabras sencillas qué debes abrir, qué dato copiar y qué hacer cuando una conexión falla.",
      example: "En Bluesky verás cómo crear una App Password. En Mastodon verás cómo crear la aplicación, qué permisos marcar y cuál es el Access Token correcto. Las demás redes mantienen sus pasos de autorización y ahora el manual reúne todas las respuestas.",
      modulePath: "/dashboard/configuracion?tab=social",
      sourceCommit: "social-guides-20260823",
    },
  });
  console.log("ProductUpdate: guía de redes agregada.");
}

main().finally(() => prisma.$disconnect());
