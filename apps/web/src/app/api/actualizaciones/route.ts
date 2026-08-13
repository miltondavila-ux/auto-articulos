import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId, requireAdmin } from "@/lib/current-user";

const CATEGORIES = new Set(["nuevas-herramientas", "arreglos"]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Lista el conocimiento reciente que se muestra a todos los usuarios. */
export async function GET() {
  try {
    await getCurrentUserId();
    const updates = await prisma.productUpdate.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ updates });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
}

/**
 * Punto de entrada administrativo para el futuro automatismo de commits.
 * Los usuarios finales solo pueden consultar este registro.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { title, category, summary, example, sourceCommit, date } = body;
  if (
    !isNonEmptyString(title) ||
    !isNonEmptyString(summary) ||
    !isNonEmptyString(example) ||
    !isNonEmptyString(category) ||
    !CATEGORIES.has(category)
  ) {
    return NextResponse.json(
      { error: "titulo, categoria, resumen y ejemplo son obligatorios" },
      { status: 400 },
    );
  }

  const parsedDate = date === undefined ? new Date() : new Date(String(date));
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "fecha inválida" }, { status: 400 });
  }
  const modulePath = body.modulePath;
  if (modulePath !== undefined && modulePath !== null && (!isNonEmptyString(modulePath) || !modulePath.startsWith("/dashboard/"))) {
    return NextResponse.json({ error: "modulePath debe ser una ruta interna de dashboard" }, { status: 400 });
  }

  try {
    const update = await prisma.productUpdate.create({
      data: {
        title: title.trim(),
        category,
        summary: summary.trim(),
        example: example.trim(),
        date: parsedDate,
        sourceCommit: isNonEmptyString(sourceCommit) ? sourceCommit.trim() : null,
        modulePath: isNonEmptyString(modulePath) ? modulePath.trim() : null,
      },
    });
    return NextResponse.json({ update }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe una actualización para este commit" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "No se pudo guardar la actualización" }, { status: 500 });
  }
}
