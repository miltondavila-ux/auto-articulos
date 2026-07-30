import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";

// Endpoint temporal de un solo uso: aplica la migración de
// monthlyArticleLimit + disableIndexing en producción (no hay acceso directo
// a la base desde local). SQL idempotente (IF NOT EXISTS), segura de
// re-ejecutar. Se elimina después de usarse.
export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "monthlyArticleLimit" INTEGER;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Run" ADD COLUMN IF NOT EXISTS "disableIndexing" BOOLEAN NOT NULL DEFAULT false;`
  );

  return NextResponse.json({ ok: true });
}
