import "dotenv/config";
import { prisma } from "@auto-articulos/db";

// Chequeo puntual (22/8/2026): Mauricio Medina reporta que no puede
// seleccionar categoría en el módulo de publicaciones y que el worker no
// arranca para él. Diagnóstico de solo lectura: usuario, categorías
// sincronizadas, credencial guardada, y estado real de sus runs.
async function main() {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { contains: "mauricio", mode: "insensitive" } },
        { name: { contains: "mauricio", mode: "insensitive" } },
        { name: { contains: "medin", mode: "insensitive" } },
      ],
    },
  });

  if (!user) {
    console.log("Usuario Mauricio no encontrado por nombre/email.");
    return;
  }

  const {
    passwordHash,
    initialPasswordEncrypted,
    ...safeUser
  } = user as Record<string, unknown> as any;
  console.log("User:", JSON.stringify(safeUser, null, 2));

  const categories = await prisma.category.findMany({
    where: { userId: user.id },
  });
  console.log(
    `Categorías guardadas (${categories.length}):`,
    JSON.stringify(categories, null, 2),
  );

  const syncJobs = await prisma.categorySyncJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log("Últimos CategorySyncJob:", JSON.stringify(syncJobs, null, 2));

  const credential = await prisma.credential.findFirst({
    where: { userId: user.id },
    select: { platform: true, updatedAt: true, createdAt: true },
  });
  console.log("Credencial guardada:", JSON.stringify(credential, null, 2));

  const runs = await prisma.run.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      status: true,
      createdAt: true,
      finishedAt: true,
      category: { select: { name: true, externalId: true } },
      titles: {
        select: {
          text: true,
          status: true,
          errorMessage: true,
          attempts: true,
          processedAt: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });
  console.log("Últimos 10 runs:", JSON.stringify(runs, null, 2));

  console.log(
    "workerBusyUntil (reserva activa):",
    (user as any).workerBusyUntil,
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exitCode = 1;
});
