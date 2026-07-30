import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";

// Endpoint temporal de un solo uso: aplica la migración de finalTitle en
// producción. SQL idempotente (IF NOT EXISTS). Se elimina después de usarse.
export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "finalTitle" TEXT;`
  );

  return NextResponse.json({ ok: true });
}
