import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function GET() {
  try {
    const sessionUserId = await getCurrentUserId();
    if (!sessionUserId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sessionUser = await prisma.user.findUnique({ where: { id: sessionUserId } });
    if (!sessionUser || sessionUser.email !== "miltondavila@gmail.com") {
      return NextResponse.json({ error: "No autorizado. Solo el administrador principal puede realizar esta acción." }, { status: 403 });
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

    console.log("FIX_PATRICIA run inspect:", run ? { id: run.id, status: run.status, titlesCount: run.titles.length, eventsCount: run.titles[0]?.events.length } : null);

    if (!run || run.titles.length === 0) {
      return NextResponse.json({ active: false });
    }

    const title = run.titles[0];
    const events = title.events;

    // 2. Parsear los logs para extraer información estructurada
    let total = 10;
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

      // El worker escribe "✓ ¡Reparado con éxito! (...)". La expresión
      // anterior esperaba otro texto y por eso nunca mostraba el artículo.
      const repairMatch = event.message.match(
        /(?:✓\s*¡?Reparado con éxito!?\s*\(\d+ de \d+\)|Ya corregido):\s*(.*?)\s*—\s*Enlace:\s*(.+)/i,
      );
      if (repairMatch) {
        repaired.push({
          title: repairMatch[1].trim(),
          url: repairMatch[2].trim(),
        });
      }
    }

    processed = repaired.length;

    const historyRuns = await prisma.run.findMany({
      where: {
        category: { name: "FIX_PATRICIA" },
        user: { email: { contains: "patricia", mode: "insensitive" } },
      },
      orderBy: { createdAt: "desc" },
      include: {
        titles: {
          where: { text: { contains: "hasta 20 artículos" } },
          include: { events: { orderBy: { createdAt: "asc" } } },
        },
      },
    });
    const history = historyRuns.filter((historyRun) => historyRun.titles.length > 0).map((historyRun) => {
      const messages = historyRun.titles.flatMap((item) =>
        item.events.map((event) => event.message),
      );

      const batchArticles: { title: string; url: string; status: "repaired" | "already_correct" }[] = [];
      messages.forEach((msg) => {
        const repairMatch = msg.match(
          /(?:✓\s*¡?Reparado con éxito!?\s*\(\d+ de \d+\)|Ya corregido):\s*(.*?)\s*—\s*Enlace:\s*(.+)/i,
        );
        if (repairMatch) {
          const type = msg.toLowerCase().includes("reparado con éxito") ? "repaired" : "already_correct";
          batchArticles.push({
            title: repairMatch[1].trim(),
            url: repairMatch[2].trim(),
            status: type,
          });
        }
      });

      const repairedCount = batchArticles.filter((a) => a.status === "repaired").length;
      const alreadyCorrectCount = batchArticles.filter((a) => a.status === "already_correct").length;
      const stopPoint = [...messages]
        .reverse()
        .find((message) =>
          /^(PUNTO DE PARADA|SIN PENDIENTES|Error general)/i.test(message),
        );

      return {
        id: historyRun.id,
        status: historyRun.status,
        createdAt: historyRun.createdAt,
        finishedAt: historyRun.finishedAt,
        repairedCount,
        alreadyCorrectCount,
        totalReviewed: batchArticles.length,
        articles: batchArticles,
        logs: messages,
        stopPoint: stopPoint ?? null,
      };
    });

    const repairedHistoryMap = new Map<string, { title: string; url: string; date: Date }>();
    for (const historyRun of historyRuns) {
      for (const t of historyRun.titles) {
        for (const event of t.events) {
          const repairMatch = event.message.match(
            /(?:✓\s*¡?Reparado con éxito!?\s*\(\d+ de \d+\)|Ya corregido):\s*(.*?)\s*—\s*Enlace:\s*(.+)/i,
          );
          if (repairMatch) {
            const titleStr = repairMatch[1].trim();
            const urlStr = repairMatch[2].trim();
            repairedHistoryMap.set(urlStr, {
              title: titleStr,
              url: urlStr,
              date: event.createdAt,
            });
          }
        }
      }
    }
    const repairedHistory = Array.from(repairedHistoryMap.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );

    return NextResponse.json({
      active: true,
      status: run.status,
      createdAt: run.createdAt,
      finishedAt: run.finishedAt,
      total,
      processed,
      repaired,
      logs: logs.slice(-15),
      history,
      repairedHistory,
    });
  } catch (err) {
    console.error("Error al obtener estado de reparación de Patricia:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
