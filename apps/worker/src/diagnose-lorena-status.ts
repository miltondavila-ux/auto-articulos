import "dotenv/config";
import { prisma } from "@auto-articulos/db";

// Chequeo puntual (15/8/2026): saber el estado REAL en base de datos del
// ultimo lote/titulo de Lorena, sin esperar a que termine el workflow
// completo (los logs de un job no estan disponibles hasta que el RUN
// entero termina).
async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "lorenalvarez30@gmail.com" },
    select: { id: true, workerBusyUntil: true },
  });
  if (!user) {
    console.log("Usuario no encontrado");
    return;
  }
  console.log("User:", JSON.stringify(user, null, 2));

  const allPendingRuns = await prisma.run.findMany({
    where: { status: { in: ["pending", "running"] } },
    select: {
      id: true,
      userId: true,
      status: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
      titles: { select: { text: true, status: true }, take: 5 },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  console.log(
    "TODOS los runs pending/running en todo el sistema:",
    JSON.stringify(allPendingRuns, null, 2),
  );

  const activeTitles = await prisma.title.findMany({
    where: { run: { userId: user.id }, status: { in: ["pending", "processing"] } },
    select: {
      id: true,
      text: true,
      status: true,
      attempts: true,
      runId: true,
      run: { select: { status: true, createdAt: true } },
    },
  });
  console.log("Títulos pending/processing AHORA:", JSON.stringify(activeTitles, null, 2));

  const activeRuns = await prisma.run.findMany({
    where: { userId: user.id, status: { in: ["pending", "running"] } },
    select: { id: true, status: true, createdAt: true, finishedAt: true },
  });
  console.log("Runs pending/running AHORA:", JSON.stringify(activeRuns, null, 2));

  const runs = await prisma.run.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      status: true,
      createdAt: true,
      finishedAt: true,
      titles: {
        select: {
          id: true,
          text: true,
          status: true,
          errorMessage: true,
          attempts: true,
          processedAt: true,
        },
        orderBy: { order: "asc" },
        take: 10,
      },
    },
  });
  console.log("Runs recientes:", JSON.stringify(runs, null, 2));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exitCode = 1;
});
