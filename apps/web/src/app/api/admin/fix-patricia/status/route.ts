import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function GET() {
  try {
    const sessionUserId = await getCurrentUserId();
    if (!sessionUserId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 1. Buscar el último Run de reparación (categoría FIX_PATRICIA)
    const run = await prisma.run.findFirst({
      where: {
        category: {
          name: "FIX_PATRICIA",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        titles: {
          include: {
            events: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
    });

    if (!run || run.titles.length === 0) {
      return NextResponse.json({ active: false });
    }

    const title = run.titles[0];
    const events = title.events;

    // 2. Parsear los logs para extraer información estructurada
    let total = 0;
    let processed = 0;
    const repaired: { title: string; url: string }[] = [];
    const logs: string[] = [];

    for (const event of events) {
      logs.push(event.message);

      // Buscar total de artículos
      // Ejemplo: "Se identificaron 300 artículos en total para revisar."
      const totalMatch = event.message.match(/Se identificaron (\d+) artículos/i);
      if (totalMatch) {
        total = parseInt(totalMatch[1], 10);
      }

      // Buscar progreso actual de análisis
      // Ejemplo: "... analizados 50/300 artículos"
      const analizadosMatch = event.message.match(/analizados (\d+)\/(\d+)/i);
      if (analizadosMatch) {
        processed = parseInt(analizadosMatch[1], 10);
      }

      // Buscar artículos reparados
      // Ejemplo: "✓ Reparado con éxito (5 de 300): Mi Titulo — Enlace: http://..."
      // O: "[5/300] Reparando:..."
      const progressMatch = event.message.match(/^\[(\d+)\/\d+\]/);
      if (progressMatch) {
        processed = parseInt(progressMatch[1], 10);
      }

      const repairMatch = event.message.match(/✓ Reparado con éxito \(\d+ de \d+\): (.*) — Enlace: (.*)/i);
      if (repairMatch) {
        repaired.push({
          title: repairMatch[1].trim(),
          url: repairMatch[2].trim(),
        });
      }
    }

    // Si terminó con éxito, processed = total
    if (run.status === "success" && total > 0) {
      processed = total;
    }

    return NextResponse.json({
      active: true,
      status: run.status,
      createdAt: run.createdAt,
      finishedAt: run.finishedAt,
      total,
      processed,
      repaired,
      logs: logs.slice(-15), // Devolver últimos 15 logs para el panel rápido
    });
  } catch (err) {
    console.error("Error al obtener estado de reparación de Patricia:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
