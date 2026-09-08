import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = "lorenalvarez30@gmail.com";
const password = process.env.LOCAL_LORENA_PASSWORD;

if (!password || password.length < 8) {
  throw new Error(
    "Define LOCAL_LORENA_PASSWORD con al menos 8 caracteres. Nunca uses aquí la contraseña de producción.",
  );
}

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      name: "Lorena Alvarez (pruebas locales)",
      firstName: "Lorena",
      lastName: "Alvarez",
      role: "user",
      platformDomain: "net",
      contentLanguage: "es",
      dailyArticleLimit: 90,
      maxTitlesPerBatch: 90,
      trialUnlocked: true,
      hasImageCredits: true,
    },
    create: {
      email,
      passwordHash,
      name: "Lorena Alvarez (pruebas locales)",
      firstName: "Lorena",
      lastName: "Alvarez",
      role: "user",
      platformDomain: "net",
      contentLanguage: "es",
      dailyArticleLimit: 90,
      maxTitlesPerBatch: 90,
      trialUnlocked: true,
      hasImageCredits: true,
    },
    select: { id: true, email: true },
  });

  console.log(`Usuario local listo: ${user.email} (${user.id})`);
  console.log("No se copiaron integraciones, tokens, secretos ni datos de producción.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
