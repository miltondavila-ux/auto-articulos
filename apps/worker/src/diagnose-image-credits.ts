import "dotenv/config";
import { prisma } from "@auto-articulos/db";

// Diagnóstico puntual de solo lectura (3/9/2026): verificar en producción,
// después del deploy del nuevo flujo de créditos de imagen, que
// User.hasImageCredits solo se movió por creaciones reales confirmadas y que
// los runs "halted" por esa causa dejaron a los demás títulos disponibles en
// Oportunidades, en vez de seguir procesando el resto del lote.
async function main() {
  const usersWithoutCredits = await prisma.user.findMany({
    where: { hasImageCredits: false },
    select: { id: true, email: true, name: true },
  });
  console.log(
    "Usuarios con hasImageCredits = false AHORA MISMO:",
    JSON.stringify(usersWithoutCredits, null, 2),
  );

  const usersWithCredits = await prisma.user.count({ where: { hasImageCredits: true } });
  console.log(
    `Resumen: hasImageCredits=true -> ${usersWithCredits}, =false -> ${usersWithoutCredits.length}`,
  );

  const lorena = await prisma.user.findUnique({
    where: { email: "lorenalvarez30@gmail.com" },
    select: { id: true, email: true, hasImageCredits: true },
  });
  console.log("Cuenta de pruebas (Lorena):", JSON.stringify(lorena, null, 2));

  // Títulos recientes cuyo mensaje de error coincide con el detector de
  // créditos de imagen, para ver si el texto claro (displayMessage) se
  // guardó bien y en qué runs aparece.
  const creditTitles = await prisma.title.findMany({
    where: {
      errorMessage: { contains: "créditos de imagen", mode: "insensitive" },
    },
    orderBy: { processedAt: "desc" },
    take: 10,
    select: {
      id: true,
      text: true,
      status: true,
      attempts: true,
      errorMessage: true,
      processedAt: true,
      runId: true,
      run: { select: { status: true, userId: true, finishedAt: true } },
    },
  });
  console.log(
    "Últimos títulos con mensaje de falta de créditos de imagen:",
    JSON.stringify(creditTitles, null, 2),
  );

  // Para cada run afectado, revisar si el resto de sus títulos quedó
  // "pending"/"processing" (bug: el lote siguió) o si el run pasó a
  // "halted" con los demás títulos ya reincorporados a Oportunidades
  // (comportamiento esperado tras el cambio).
  const affectedRunIds = [...new Set(creditTitles.map((t) => t.runId))];
  if (affectedRunIds.length > 0) {
    const affectedRuns = await prisma.run.findMany({
      where: { id: { in: affectedRunIds } },
      select: {
        id: true,
        status: true,
        finishedAt: true,
        titles: {
          select: { id: true, status: true, errorMessage: true },
          orderBy: { order: "asc" },
        },
      },
    });
    console.log(
      "Runs afectados por falta de créditos (detalle completo de títulos):",
      JSON.stringify(affectedRuns, null, 2),
    );
  } else {
    console.log(
      "No hay ningún título con mensaje de falta de créditos de imagen todavía (no se disparó el caso real desde el deploy).",
    );
  }

  const recentHalted = await prisma.run.findMany({
    where: { status: "halted" },
    orderBy: { finishedAt: "desc" },
    take: 5,
    select: {
      id: true,
      userId: true,
      finishedAt: true,
      titles: { select: { status: true, errorMessage: true } },
    },
  });
  console.log("Últimos 5 runs 'halted' (cualquier causa):", JSON.stringify(recentHalted, null, 2));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exitCode = 1;
});
