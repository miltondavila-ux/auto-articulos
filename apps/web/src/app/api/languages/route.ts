import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

const DEFAULT_LANGUAGES = [
  { externalId: "es", name: "Español" },
  { externalId: "en", name: "Inglés" },
  { externalId: "pt", name: "Portugués" },
  { externalId: "fr", name: "Francés" },
  { externalId: "it", name: "Italiano" },
  { externalId: "de", name: "Alemán" },
];

export async function GET() {
  const userId = await getCurrentUserId();

  let [languages, lastSyncJob] = await Promise.all([
    prisma.language.findMany({
      where: { userId, platform: "10minutesWebsite" },
      orderBy: { name: "asc" },
    }),
    prisma.languageSyncJob.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (languages.length === 0) {
    await prisma.$transaction(
      DEFAULT_LANGUAGES.map((lang) =>
        prisma.language.upsert({
          where: {
            userId_platform_externalId: {
              userId,
              platform: "10minutesWebsite",
              externalId: lang.externalId,
            },
          },
          create: {
            userId,
            platform: "10minutesWebsite",
            externalId: lang.externalId,
            name: lang.name,
          },
          update: { name: lang.name },
        }),
      ),
    );

    languages = await prisma.language.findMany({
      where: { userId, platform: "10minutesWebsite" },
      orderBy: { name: "asc" },
    });
  }

  return NextResponse.json({ languages, lastSyncJob });
}
