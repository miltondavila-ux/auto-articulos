import { NextRequest, NextResponse } from "next/server";
import { generateSocialImageRaw } from "@auto-articulos/shared";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function POST(request: NextRequest) {
  const { summary, platform } = await request.json();

  if (!summary || !platform) {
    return NextResponse.json({ error: "summary y platform son requeridos" }, { status: 400 });
  }

  let userPrompts: { imagePrompt: string | null; infographicPrompt: string | null; businessLogoUrl: string | null } | null = null;
  try {
    const userId = await getCurrentUserId();
    userPrompts = await prisma.user.findUnique({
      where: { id: userId },
      select: { imagePrompt: true, infographicPrompt: true, businessLogoUrl: true },
    });
  } catch {
    // Sin usuario autenticado, usar prompts por defecto
  }

  const extraStyle = platform === "linkedin"
    ? "Imagen profesional y limpia para LinkedIn. Colores corporativos azul oscuro y blanco, composición minimalista con texto claro y legible."
    : undefined;

  // 50% de probabilidad de incluir el logo del usuario si existe
  const logoUrl = userPrompts?.businessLogoUrl && Math.random() < 0.5 ? userPrompts.businessLogoUrl : null;

  const result = await generateSocialImageRaw(summary, userPrompts?.imagePrompt, extraStyle, logoUrl, platform);

  if (!result) {
    return NextResponse.json({ error: "No se pudo generar la imagen" }, { status: 500 });
  }

  if (result.url) {
    return NextResponse.json({ imageUrl: result.url });
  }

  if (result.b64) {
    return NextResponse.json({ imageBase64: result.b64 });
  }

  return NextResponse.json({ error: "No se pudo generar la imagen" }, { status: 500 });
}
