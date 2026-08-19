import { NextRequest, NextResponse } from "next/server";
import { getArticleOpenGraphImage } from "@auto-articulos/shared";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function POST(request: NextRequest) {
  const { titleId } = await request.json();

  if (!titleId || typeof titleId !== "string") {
    return NextResponse.json({ error: "titleId es requerido" }, { status: 400 });
  }

  try {
    const userId = await getCurrentUserId();
    const title = await prisma.title.findFirst({
      where: { id: titleId, run: { userId }, status: "success", articleUrl: { not: null } },
      select: { articleUrl: true },
    });
    if (!title?.articleUrl) {
      return NextResponse.json({ error: "Artículo no encontrado o sin URL publicada" }, { status: 404 });
    }

    const imageUrl = await getArticleOpenGraphImage(title.articleUrl);
    if (!imageUrl) {
      return NextResponse.json({
        imageUrl: null,
        imageUnavailable: true,
        message: "Este artículo no declara una imagen destacada (og:image).",
      });
    }

    return NextResponse.json({ imageUrl, imageUnavailable: false });
  } catch {
    return NextResponse.json({ error: "No se pudo obtener la imagen del artículo" }, { status: 500 });
  }
}
