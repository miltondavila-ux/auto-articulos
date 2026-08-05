import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

// Registra la aceptación expresa del aviso de divulgación de Oportunidades
// (algoritmo automatizado + IA, sin responsabilidad del administrador sobre
// las decisiones de publicación) — pedido explícito del usuario, 5/8/2026.
// Solo escribe la fecha/hora la primera vez; si ya estaba aceptado, no la
// vuelve a pisar (la fecha original es la que tiene valor legal).
export async function POST() {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { opportunitiesDisclosureAcceptedAt: true },
  });
  if (user.opportunitiesDisclosureAcceptedAt) {
    return NextResponse.json({
      opportunitiesDisclosureAcceptedAt: user.opportunitiesDisclosureAcceptedAt,
    });
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { opportunitiesDisclosureAcceptedAt: new Date() },
    select: { opportunitiesDisclosureAcceptedAt: true },
  });
  return NextResponse.json(updated);
}
