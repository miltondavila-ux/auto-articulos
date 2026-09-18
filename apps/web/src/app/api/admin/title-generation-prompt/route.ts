import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import {
  TITLE_GENERATION_PROMPT_MAX_LENGTH,
  getTitleGenerationPrompt,
  setTitleGenerationPrompt,
} from "@/lib/title-generation-prompt";
import { PROMPT_VARIABLES, findUnknownPlaceholders } from "@/lib/title-generation-core";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Solo administradores. El texto del prompt NUNCA sale por una ruta de usuario:
// la ruta de usuario (/api/title-generation) solo dice si está configurado.

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const prompt = await getTitleGenerationPrompt();
  return NextResponse.json({
    prompt: prompt ?? "",
    variables: PROMPT_VARIABLES,
    maxLength: TITLE_GENERATION_PROMPT_MAX_LENGTH,
    unknownPlaceholders: prompt ? findUnknownPlaceholders(prompt) : [],
  });
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const prompt = (body as { prompt?: unknown }).prompt;
  if (typeof prompt !== "string") {
    return NextResponse.json({ error: "prompt debe ser texto" }, { status: 400 });
  }
  const clean = prompt.trim();
  if (clean.length > TITLE_GENERATION_PROMPT_MAX_LENGTH) {
    return NextResponse.json(
      { error: `El prompt no puede superar ${TITLE_GENERATION_PROMPT_MAX_LENGTH} caracteres.` },
      { status: 400 },
    );
  }

  await setTitleGenerationPrompt(clean);
  return NextResponse.json({
    prompt: clean,
    // Aviso, no error: una variable desconocida se deja tal cual en el prompt.
    unknownPlaceholders: findUnknownPlaceholders(clean),
  });
}
