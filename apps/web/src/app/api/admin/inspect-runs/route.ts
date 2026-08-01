import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";

// Endpoint administrativo permanente de solo lectura: permite inspeccionar el
// historial de OTRO usuario para diagnosticar un problema reportado, ya que
// /api/runs normal está limitado al usuario en sesión. Se conserva protegido
// por requireAdmin() para diagnósticos futuros.
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email es requerido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 },
    );
  }

  const runs = await prisma.run.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      titles: {
        orderBy: { order: "asc" },
        include: { events: { orderBy: { createdAt: "asc" } } },
      },
      category: true,
    },
    take: 5,
  });

  return NextResponse.json({ runs });
}
