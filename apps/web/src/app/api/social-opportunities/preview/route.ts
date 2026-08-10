import { NextRequest, NextResponse } from "next/server";
import { buildImagePrompt } from "@auto-articulos/shared";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";

const STYLE_MAP: Record<string, string> = {
  "instagram-carousel": `Imagen con texto superpuesto grande y llamativo. Fondo visual moderno, colores vibrantes, con una frase clave o tip escrita directamente en la imagen en tipografía grande y audaz. Diseño tipo slide informativo para redes sociales.`,
  "instagram-reel-image": `Formato vertical 9:16 tipo portada de Instagram Reel. Texto grande y llamativo superpuesto, fondo degradado con colores profesionales, tipografía moderna. Diseñado para detener el scroll.`,
  "instagram-infografia": `Estilo infografía profesional con datos, números, iconos y gráficos minimalistas. Fondo claro con acentos de color. Diseño informativo y fácil de leer.`,
  "threads": `Imagen moderna para redes sociales, colores vibrantes, composición profesional, tipografía llamativa.`,
};

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI no configurado" }, { status: 500 });
  }

  const { summary, platform } = await request.json();

  if (!summary || !platform) {
    return NextResponse.json({ error: "summary y platform son requeridos" }, { status: 400 });
  }

  let userPrompts: { imagePrompt: string | null; infographicPrompt: string | null } | null = null;
  try {
    const userId = await getCurrentUserId();
    userPrompts = await prisma.user.findUnique({
      where: { id: userId },
      select: { imagePrompt: true, infographicPrompt: true },
    });
  } catch {
    // Sin usuario autenticado, usar prompts por defecto
  }

  const isInfografia = platform === "instagram-infografia";
  const basePrompt = buildImagePrompt(summary, userPrompts?.imagePrompt);
  let style = STYLE_MAP[platform] || STYLE_MAP["threads"];
  if (isInfografia && userPrompts?.infographicPrompt?.trim()) {
    style = userPrompts.infographicPrompt.trim();
  }
  const prompt = `${basePrompt}\n\n${style}`;

  try {
    const response = await fetch(OPENAI_IMAGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: "gpt-image-1-mini", prompt, size: "1024x1024", n: 1 }),
    });

    const data = (await response.json()) as { data?: { url?: string; b64_json?: string }[] };

    if (data.data?.[0]?.url) {
      return NextResponse.json({ imageUrl: data.data[0].url });
    }

    if (data.data?.[0]?.b64_json) {
      return NextResponse.json({ imageBase64: data.data[0].b64_json });
    }

    return NextResponse.json({ error: "No se pudo generar la imagen" }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
