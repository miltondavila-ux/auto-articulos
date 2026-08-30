import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function GET() {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { selectedSiteDomain: true, selectedSitePanel: true, siteSelectionConfirmed: true },
  });
  return NextResponse.json(user);
}

/**
 * Confirma el ÚNICO panel/dominio con el que esta cuenta de Auto Artículos
 * va a trabajar para siempre (pedido explícito de Milton: si las mismas
 * credenciales exponen más de un sitio real, el resto queda fuera de esta
 * cuenta — para el otro dominio, otra cuenta).
 *
 * A diferencia de la primera versión de este endpoint, `panel` NO se acepta
 * como texto libre: tiene que coincidir exactamente con uno de los paneles
 * REALES que devolvió el último job de detección exitoso (ver
 * /api/site-selection/detect y detectSites en el worker). Así se elimina el
 * riesgo que Codex dejó pendiente ("el dominio no demuestra pertenecer al
 * panel escogido") de raíz: ya no hay dos valores independientes que puedan
 * no coincidir, porque `selectedSiteDomain` se deriva del mismo panel real
 * confirmado, nunca de un campo de texto aparte.
 */
export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();

  const existing = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { siteSelectionConfirmed: true },
  });
  if (existing.siteSelectionConfirmed) {
    return NextResponse.json(
      { error: "El dominio de esta cuenta ya está confirmado y no se puede cambiar. Para otro dominio, crea otra cuenta de Auto Artículos." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const panel = typeof body.panel === "string" ? body.panel.trim() : "";

  const detectJob = await prisma.categorySyncJob.findFirst({
    where: { userId, mode: "detect", status: "success" },
    orderBy: { createdAt: "desc" },
  });
  if (!detectJob) {
    return NextResponse.json(
      { error: "Primero detecta los sitios reales de tu cuenta antes de confirmar uno." },
      { status: 400 },
    );
  }

  const realPanels = detectJob.detectedPanels;
  if (realPanels.length === 0) {
    if (panel !== "") {
      return NextResponse.json(
        { error: "Tu cuenta no tiene varios sitios/paneles: no hay nada que elegir." },
        { status: 400 },
      );
    }
  } else if (!realPanels.includes(panel)) {
    return NextResponse.json(
      { error: `El sitio elegido no coincide con ninguno de los detectados en tu cuenta (${realPanels.join(", ")}).` },
      { status: 400 },
    );
  }

  // Todo en una sola transacción: si el usuario queda confirmado con un
  // dominio pero la adopción de sus categorías/integraciones históricas no
  // llega a correr (caída a mitad de camino), esas filas quedarían con
  // `siteDomain=""` para siempre mientras todas las consultas ya filtran por
  // el nuevo dominio — invisibles de la nada. Todo o nada evita ese estado a
  // medias.
  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { selectedSiteDomain: panel, selectedSitePanel: panel, siteSelectionConfirmed: true },
      select: { selectedSiteDomain: true, selectedSitePanel: true, siteSelectionConfirmed: true },
    }),
    prisma.category.updateMany({
      where: { userId, siteDomain: "" },
      data: { siteDomain: panel },
    }),
    prisma.searchIntegration.updateMany({
      where: { userId, siteDomain: "" },
      data: { siteDomain: panel },
    }),
  ]);

  return NextResponse.json(user);
}
