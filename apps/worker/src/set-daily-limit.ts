import "dotenv/config";
import { prisma } from "@auto-articulos/db";

/**
 * Pedido directo de Milton (30/8/2026): bajar el máximo de artículos por
 * día a 5 para todos los usuarios que NO sean administradores. Deja a los
 * administradores sin tocar (su límite, si tienen uno, no cambia).
 *
 * Script de un solo uso, mismo patrón que query-users.ts: imprime el
 * estado ANTES de escribir nada, para poder revisar en el log de GitHub
 * Actions qué se va a cambiar antes de que ya haya pasado.
 */
const NEW_DAILY_LIMIT = 5;

async function main() {
  console.log(`=== BAJANDO dailyArticleLimit A ${NEW_DAILY_LIMIT} (usuarios no-admin) ===`);

  const affected = await prisma.user.findMany({
    where: { role: { not: "admin" } },
    select: { id: true, email: true, name: true, dailyArticleLimit: true },
    orderBy: { email: "asc" },
  });

  console.log(`Usuarios no-admin encontrados: ${affected.length}`);
  console.log(
    "Antes:",
    JSON.stringify(
      affected.map((u) => ({ email: u.email, dailyArticleLimit: u.dailyArticleLimit })),
      null,
      2,
    ),
  );

  const result = await prisma.user.updateMany({
    where: { role: { not: "admin" } },
    data: { dailyArticleLimit: NEW_DAILY_LIMIT },
  });

  console.log(`Filas actualizadas: ${result.count}`);

  const adminCount = await prisma.user.count({ where: { role: "admin" } });
  console.log(`Administradores NO tocados: ${adminCount}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error al bajar dailyArticleLimit:", e);
  process.exit(1);
});
