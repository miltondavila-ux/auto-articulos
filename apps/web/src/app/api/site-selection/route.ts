import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function GET() {
  const userId = await getCurrentUserId();
  const [user, panels] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { activeSitePanel: true } }),
    prisma.category.findMany({
      where: { userId, platform: "10minutesWebsite", source: { not: "archived" } },
      select: { panel: true },
      distinct: ["panel"],
      orderBy: { panel: "asc" },
    }),
  ]);
  return NextResponse.json({ activeSitePanel: user.activeSitePanel, panels: panels.map((p) => p.panel) });
}

export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId();
  const body = await request.json().catch(() => ({}));
  if (typeof body.panel !== "string") {
    return NextResponse.json({ error: "panel es requerido" }, { status: 400 });
  }
  const panel = body.panel.trim();
  const exists = await prisma.category.findFirst({
    where: { userId, platform: "10minutesWebsite", panel, source: { not: "archived" } },
    select: { id: true },
  });
  if (!exists && panel !== "") {
    return NextResponse.json({ error: "El sitio seleccionado no tiene categorías sincronizadas." }, { status: 400 });
  }
  await prisma.user.update({ where: { id: userId }, data: { activeSitePanel: panel } });
  return NextResponse.json({ ok: true, activeSitePanel: panel });
}
