import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { triggerWorkerNow } from "@/lib/trigger-worker";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id es requerido" }, { status: 400 });
    }

    const opp = await prisma.socialOpportunity.findFirst({
      where: { id, userId, status: "pending" },
    });

    if (!opp) {
      return NextResponse.json(
        { error: "Propuesta no encontrada o ya publicada" },
        { status: 404 }
      );
    }

    if (!opp.articleUrl) {
      return NextResponse.json(
        { error: "El artículo no tiene URL publicada. Publica el artículo primero." },
        { status: 400 }
      );
    }

    const supported = [
      "threads",
      "x",
      "instagram-carousel",
      "instagram-reel-image",
      "instagram-infografia",
    ];
    if (!supported.includes(opp.platform)) {
      return NextResponse.json(
        { error: `Plataforma ${opp.platform} no soportada todavía.` },
        { status: 400 }
      );
    }

    if (opp.platform.startsWith("instagram")) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { allowInstagramPublishing: true },
      });
      if (!user?.allowInstagramPublishing) {
        return NextResponse.json(
          { error: "No tienes permiso para publicar en Instagram. Contacta al administrador." },
          { status: 403 }
        );
      }
    }

    await prisma.socialOpportunity.update({
      where: { id },
      data: { status: "queued", errorLog: null },
    });

    await triggerWorkerNow();

    return NextResponse.json({
      success: true,
      message: opp.platform.startsWith("instagram")
        ? "Publicación encolada. El sistema generará las imágenes y publicará en Instagram en segundo plano."
        : opp.platform === "x"
        ? "Publicación encolada. El sistema generará la imagen y publicará en X (Twitter) en segundo plano."
        : "Publicación encolada. El sistema generará la imagen y publicará en Threads en segundo plano.",
    });
  } catch {
    return NextResponse.json({ error: "Error interno al publicar" }, { status: 500 });
  }
}
