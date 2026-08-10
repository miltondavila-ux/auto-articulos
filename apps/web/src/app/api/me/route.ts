import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUser, getCurrentUserId } from "@/lib/current-user";

// Un poco más del doble del texto de ejemplo que dio el usuario (340
// caracteres) — pedido explícito, 6/8/2026.
export const MAX_ARTICLE_SIGNATURE_LEN = 700;

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({
    email: user.email,
    role: user.role,
    maxTitlesPerBatch: user.maxTitlesPerBatch,
    contentLanguage: user.contentLanguage,
    articleSignature: user.articleSignature,
    opportunitiesDisclosureAcceptedAt: user.opportunitiesDisclosureAcceptedAt,
    phone: user.phone,
    imagePrompt: user.imagePrompt,
    infographicPrompt: user.infographicPrompt,
  });
}

export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId();
  const body = await request.json();
  const data: {
    contentLanguage?: string;
    articleSignature?: string | null;
    phone?: string | null;
    imagePrompt?: string | null;
    infographicPrompt?: string | null;
  } = {};

  if ("contentLanguage" in body) {
    const { contentLanguage } = body;
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
      where: { userId, platform: "10minutesWebsite", externalId: contentLanguage },
    });
    if (!language) {
      return NextResponse.json(
        { error: "Ese idioma no está sincronizado. Sincroniza los idiomas primero." },
        { status: 400 },
      );
    }
    data.contentLanguage = contentLanguage;
  }

  if ("articleSignature" in body) {
    const { articleSignature } = body;
    if (articleSignature !== null && typeof articleSignature !== "string") {
      return NextResponse.json(
        { error: "articleSignature debe ser texto o null" },
        { status: 400 },
      );
    }
    const trimmed = typeof articleSignature === "string" ? articleSignature.trim() : "";
    if (trimmed.length > MAX_ARTICLE_SIGNATURE_LEN) {
      return NextResponse.json(
        {
          error: `El texto no puede superar los ${MAX_ARTICLE_SIGNATURE_LEN} caracteres (tiene ${trimmed.length}).`,
        },
        { status: 400 },
      );
    }
    data.articleSignature = trimmed || null;
  }

  if ("phone" in body) {
    const { phone } = body;
    if (phone !== null && typeof phone !== "string") {
      return NextResponse.json(
        { error: "El teléfono debe ser texto o null" },
        { status: 400 },
      );
    }
    const trimmed = typeof phone === "string" ? phone.trim() : "";
    data.phone = trimmed || null;
  }

  if ("imagePrompt" in body) {
    const { imagePrompt } = body;
    if (imagePrompt !== null && typeof imagePrompt !== "string") {
      return NextResponse.json(
        { error: "imagePrompt debe ser texto o null" },
        { status: 400 },
      );
    }
    const trimmed = typeof imagePrompt === "string" ? imagePrompt.trim() : "";
    data.imagePrompt = trimmed || null;
  }

  if ("infographicPrompt" in body) {
    const { infographicPrompt } = body;
    if (infographicPrompt !== null && typeof infographicPrompt !== "string") {
      return NextResponse.json(
        { error: "infographicPrompt debe ser texto o null" },
        { status: 400 },
      );
    }
    const trimmed = typeof infographicPrompt === "string" ? infographicPrompt.trim() : "";
    data.infographicPrompt = trimmed || null;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      contentLanguage: true,
      articleSignature: true,
      phone: true,
      imagePrompt: true,
      infographicPrompt: true,
    },
  });

  return NextResponse.json(user);
}
