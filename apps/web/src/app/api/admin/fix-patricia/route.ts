import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function POST() {
  try {
    // 1. Verificar sesión
    const sessionUserId = await getCurrentUserId();
    if (!sessionUserId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sessionUser = await prisma.user.findUnique({ where: { id: sessionUserId } });
    if (!sessionUser || sessionUser.email !== "miltondavila@gmail.com") {
      return NextResponse.json({ error: "No autorizado. Solo el administrador principal puede realizar esta acción." }, { status: 403 });
    }

    // 2. Buscar al usuario de Patricia Coy
    const patriciaUser = await prisma.user.findFirst({
      where: {
        email: {
          contains: "patricia",
          mode: "insensitive",
        },
      },
    });

    if (!patriciaUser) {
      return NextResponse.json({ error: "Usuario Patricia Coy no encontrado en el sistema." }, { status: 404 });
    }

    const activeRun = await prisma.run.findFirst({
      where: {
        userId: patriciaUser.id,
        status: { in: ["pending", "running"] },
        category: { name: "FIX_PATRICIA" },
      },
      select: { id: true },
    });
    if (activeRun) {
      return NextResponse.json(
        { error: "Ya existe un lote de Patricia en curso. Espera a que termine antes de continuar." },
        { status: 409 },
      );
    }

    // 3. Buscar o crear la categoría especial FIX_PATRICIA
    let category = await prisma.category.findFirst({
      where: {
        userId: patriciaUser.id,
        name: "FIX_PATRICIA",
      },
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          userId: patriciaUser.id,
          name: "FIX_PATRICIA",
          externalId: "FIX_PATRICIA",
        },
      });
    }

    // 4. Crear un Run pendiente para gatillar el worker
    const run = await prisma.run.create({
      data: {
        userId: patriciaUser.id,
        categoryId: category.id,
        status: "running",
        contentLanguage: "es",
      },
    });

    // 5. Crear el título para procesar
    const title = await prisma.title.create({
      data: {
        runId: run.id,
        text: "Reparar el siguiente lote de hasta 20 artículos de Patricia Coy",
        status: "pending",
        order: 0,
      },
    });
    await prisma.titleEvent.create({
      data: {
        titleId: title.id,
        message: "Lote solicitado. Esperando que el worker comience a procesar hasta 20 artículos...",
      },
    });

    const { triggerWorkerNow } = await import("@/lib/trigger-worker");
    await triggerWorkerNow().catch((e) => console.error("Error triggerWorkerNow:", e));

    return NextResponse.json({ ok: true, runId: run.id });
  } catch (err) {
    console.error("Error al gatillar reparación de Patricia:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
