import "dotenv/config";
import { prisma } from "@auto-articulos/db";

// Diagnóstico reutilizable de sincronización de categorías para un usuario
// puntual (patrón ya usado en casos anteriores: Antonio Aguirre, Estee Soto).
// Recibe el correo (o un fragmento) por variable de entorno USER_EMAIL_QUERY
// para no tener que crear un script nuevo cada vez que alguien reporta que
// "no le sincronizan las categorías".
async function main() {
  const query = process.env.USER_EMAIL_QUERY;
  if (!query) {
    console.error("Falta USER_EMAIL_QUERY (correo o fragmento de correo/nombre a buscar).");
    process.exitCode = 1;
    return;
  }

  console.log(`=== DIAGNÓSTICO DE SINCRONIZACIÓN DE CATEGORÍAS: "${query}" ===`);
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        platformDomain: true,
        createdAt: true,
      },
    });

    if (users.length === 0) {
      console.log("No se encontró ningún usuario que coincida.");
      return;
    }

    for (const user of users) {
      console.log("\n--------------------------------------------------");
      console.log(`Usuario: ${user.name ?? "(sin nombre)"} <${user.email}>`);
      console.log(`  id: ${user.id}`);
      console.log(`  platformDomain guardado: ${user.platformDomain ?? "(vacío)"}`);
      console.log(`  creado: ${user.createdAt.toISOString()}`);

      const credential = await prisma.credential.findUnique({
        where: { userId_platform: { userId: user.id, platform: "10minutesWebsite" } },
        select: { id: true, updatedAt: true, createdAt: true },
      });
      console.log(
        credential
          ? `  Credencial 10minutesWebsite: guardada (última actualización ${credential.updatedAt.toISOString()})`
          : "  Credencial 10minutesWebsite: NO TIENE GUARDADA (causa directa de fallo de sync)",
      );

      const jobs = await prisma.categorySyncJob.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          status: true,
          errorMessage: true,
          createdAt: true,
          finishedAt: true,
        },
      });
      console.log(`  Últimos ${jobs.length} CategorySyncJob:`);
      for (const job of jobs) {
        const durationMs = job.finishedAt
          ? job.finishedAt.getTime() - job.createdAt.getTime()
          : null;
        console.log(
          `    [${job.createdAt.toISOString()}] status=${job.status}` +
            (durationMs !== null ? ` duración=${durationMs}ms` : " (sin finishedAt)") +
            (job.errorMessage ? ` error="${job.errorMessage}"` : ""),
        );
      }

      const categories = await prisma.category.groupBy({
        by: ["source", "panel"],
        where: { userId: user.id, platform: "10minutesWebsite" },
        _count: { _all: true },
      });
      console.log(`  Categorías guardadas (agrupadas por origen/panel):`);
      if (categories.length === 0) {
        console.log("    (ninguna)");
      }
      for (const row of categories) {
        console.log(
          `    source=${row.source} panel="${row.panel || "(sin panel)"}" cantidad=${row._count._all}`,
        );
      }
    }
  } catch (error) {
    console.error("Error en diagnóstico:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exitCode = 1;
});
