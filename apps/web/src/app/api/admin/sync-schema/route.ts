import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

// Endpoint de un solo uso (idempotente, seguro re-ejecutar) para crear las
// tablas/columnas de TwitterIntegration y LinkedInIntegration en bases de
// datos donde solo se hizo `prisma db push` en local y nunca en producción
// (7/8/2026 en adelante). Usa CREATE ... IF NOT EXISTS / ADD COLUMN IF NOT
// EXISTS en todos lados, así que llamarlo varias veces no rompe nada.
const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "TwitterIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "twitterUserId" TEXT NOT NULL,
    "twitterUsername" TEXT,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TwitterIntegration_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "TwitterIntegration_userId_key" ON "TwitterIntegration"("userId")`,
  `ALTER TABLE "TwitterIntegration" ADD CONSTRAINT "TwitterIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,

  `CREATE TABLE IF NOT EXISTS "LinkedInIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "linkedinUserId" TEXT NOT NULL,
    "linkedinUsername" TEXT,
    "accessTokenEncrypted" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LinkedInIntegration_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "LinkedInIntegration_userId_key" ON "LinkedInIntegration"("userId")`,
  `ALTER TABLE "LinkedInIntegration" ADD CONSTRAINT "LinkedInIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,

  `ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "twitterPublishStatus" TEXT`,
  `ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "twitterPostId" TEXT`,
  `ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "twitterPublishError" TEXT`,
  `ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "twitterPublishAt" TIMESTAMP(3)`,
  `ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "linkedinPublishStatus" TEXT`,
  `ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "linkedinPostId" TEXT`,
  `ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "linkedinPublishError" TEXT`,
  `ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "linkedinPublishAt" TIMESTAMP(3)`,
];

export async function POST() {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  }

  const results: { statement: string; ok: boolean; error?: string }[] = [];

  for (const sql of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push({ statement: sql.slice(0, 60), ok: true });
    } catch (error: any) {
      // Constraints/índices ya existentes no son un problema real.
      const msg = error?.message || String(error);
      const alreadyExists = /already exists/i.test(msg);
      results.push({ statement: sql.slice(0, 60), ok: alreadyExists, error: alreadyExists ? undefined : msg });
    }
  }

  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({
    ok: failed.length === 0,
    total: results.length,
    failed: failed.length,
    results,
  });
}
