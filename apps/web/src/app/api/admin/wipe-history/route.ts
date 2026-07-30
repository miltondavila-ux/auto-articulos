import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";

// Endpoint temporal de un solo uso: limpia todo el historial de ejecuciones
// (TitleEvent, Title, Run) para que el usuario empiece con un historial
// limpio. No toca Credential, Category ni User. Se elimina después de usarse.
export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const events = await prisma.titleEvent.deleteMany({});
  const titles = await prisma.title.deleteMany({});
  const runs = await prisma.run.deleteMany({});

  return NextResponse.json({
    deleted: { events: events.count, titles: titles.count, runs: runs.count },
  });
}
