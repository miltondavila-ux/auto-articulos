import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const result = await prisma.$executeRawUnsafe(`
      ALTER TABLE "User"
        ADD COLUMN IF NOT EXISTS "allowLinkedInPublishing" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "allowThreadsPublishing" BOOLEAN NOT NULL DEFAULT false;
    `);

    return NextResponse.json({
      ok: true,
      message: "Migración aplicada: columnas allowLinkedInPublishing y allowThreadsPublishing agregadas.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
