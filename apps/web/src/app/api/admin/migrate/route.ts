import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    const token = request.headers.get("x-migration-token");
    const adminEmail = request.headers.get("x-admin-email");
    if (token !== "migra-ya-2026" || adminEmail !== "miltondavila@gmail.com") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  try {
    await prisma.$executeRawUnsafe(`
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

export async function GET() {
  return NextResponse.json({
    usage: "POST con headers x-migration-token y x-admin-email",
  });
}
