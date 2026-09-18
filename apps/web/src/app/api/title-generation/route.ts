import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import {
  TitleGenerationError,
  generateTitlesForUser,
  getTitleGenerationStatus,
} from "@/lib/title-generation";
import { validateInputs } from "@/lib/title-generation-core";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// Hasta dos llamadas a la IA (la primera y un reintento), cada una con su
// propio tope de 40 s. Ninguna otra ruta de la app define maxDuration.
export const maxDuration = 60;

/** Estado para la pantalla: si la función está disponible y cuántas solicitudes le quedan hoy. */
export async function GET() {
  const userId = await getCurrentUserId();
  const status = await getTitleGenerationStatus(userId);
  return NextResponse.json(status);
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  const body = (await request.json().catch(() => ({}))) as {
    categoryId?: unknown;
    contentLanguage?: unknown;
    inputs?: unknown;
  };

  if (typeof body.categoryId !== "string" || !body.categoryId) {
    return NextResponse.json({ error: "Elige una categoría.", code: "NO_CATEGORY" }, { status: 400 });
  }
  const inputs = validateInputs(body.inputs);
  if (!inputs.ok) {
    return NextResponse.json({ error: inputs.error, code: "INVALID_INPUTS" }, { status: 400 });
  }

  try {
    const result = await generateTitlesForUser({
      userId,
      categoryId: body.categoryId,
      languageValue: typeof body.contentLanguage === "string" ? body.contentLanguage : "",
      inputs: inputs.value,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TitleGenerationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[title-generation] error inesperado", error);
    return NextResponse.json(
      { error: "No se pudieron crear los títulos. No se descontó ninguna solicitud; inténtalo de nuevo.", code: "UNEXPECTED" },
      { status: 500 },
    );
  }
}
