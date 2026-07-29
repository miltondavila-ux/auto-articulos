import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";

// Endpoint temporal para corregir manualmente títulos marcados "success" cuyo
// articleUrl real se verificó a mano contra 10minutesWebsite (29/7/2026).
// Se elimina después de usarse una vez.
interface Update {
  titleId: string;
  articleUrl?: string;
  status?: "error";
  errorMessage?: string;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { updates } = (await request.json()) as { updates: Update[] };
  if (!Array.isArray(updates)) {
    return NextResponse.json({ error: "updates debe ser un arreglo" }, { status: 400 });
  }

  const results = [];
  for (const u of updates) {
    const data: Record<string, unknown> = {};
    if (u.articleUrl) {
      data.articleUrl = u.articleUrl;
    }
    if (u.status === "error") {
      data.status = "error";
      data.errorMessage =
        u.errorMessage ??
        "Verificado manualmente: el artículo no existe en 10minutesWebsite.";
    }
    const updated = await prisma.title.update({ where: { id: u.titleId }, data });
    results.push({ id: updated.id, status: updated.status, articleUrl: updated.articleUrl });
  }

  return NextResponse.json({ results });
}
