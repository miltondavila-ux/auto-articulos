import "dotenv/config";
import { prisma } from "@auto-articulos/db";

async function main() {
  console.log("=== QUERYING PRODUCTION USERS ===");
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        dailyArticleLimit: true,
        maxTitlesPerBatch: true,
      },
      orderBy: {
        email: "asc",
      },
    });

    console.log(`Found ${users.length} users:`);
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Error querying users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exitCode = 1;
});
