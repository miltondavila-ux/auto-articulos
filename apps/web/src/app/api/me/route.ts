import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUser, getCurrentUserId } from "@/lib/current-user";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({
    email: user.email,
    role: user.role,
    maxTitlesPerBatch: user.maxTitlesPerBatch,
    contentLanguage: user.contentLanguage,
  });
}

export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId();
  const { contentLanguage } = await request.json();

  if (typeof contentLanguage !== "string" || !contentLanguage.trim()) {
    return NextResponse.json(
      { error: "contentLanguage es requerido" },
      { status: 400 },
    );
  }

  // Debe coincidir con un idioma ya sincronizado desde 10minutesWebsite
  // (ver /api/languages/sync) — no se acepta cualquier texto, para no
  // guardar un valor que después no coincida con ninguna opción real del
  // selector en el sitio.
  const language = await prisma.language.findFirst({
    where: {
      userId,
      platform: "10minutesWebsite",
      externalId: contentLanguage,
    },
  });
  if (!language) {
    return NextResponse.json(
      { error: "Ese idioma no está sincronizado. Sincroniza los idiomas primero." },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { contentLanguage },
    select: { contentLanguage: true },
  });

  return NextResponse.json(user);
}
