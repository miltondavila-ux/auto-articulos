import "dotenv/config";
import { prisma } from "@auto-articulos/db";

// Diagnóstico temporal y desechable — NO es parte del producto. Se usa una
// sola vez para ver el errorMessage/eventos reales del último título de
// prueba en la cuenta de Guillermo Martinez y se borra después.
async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "info@guillermo-martinez.com" },
    select: { id: true },
  });
  if (!user) {
    console.log("Usuario no encontrado");
    return;
  }

  const titles = await prisma.title.findMany({
    where: { run: { userId: user.id } },
    orderBy: { id: "desc" },
    take: 5,
    select: {
      id: true,
      text: true,
      status: true,
      attempts: true,
      finalTitle: true,
      articleUrl: true,
      errorMessage: true,
      processedAt: true,
      run: { select: { id: true, status: true, createdAt: true, category: { select: { name: true } } } },
      events: { orderBy: { createdAt: "asc" }, select: { message: true, createdAt: true } },
    },
  });
  console.log("Últimos 5 títulos de Guillermo Martinez:", JSON.stringify(titles, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
