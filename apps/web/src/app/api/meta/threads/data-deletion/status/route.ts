import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const confirmationCode = request.nextUrl.searchParams.get("confirmation_code");
  if (!confirmationCode) {
    return new NextResponse("Falta el código de confirmación.", { status: 400 });
  }

  return new NextResponse(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Solicitud recibida</title></head><body><h1>Solicitud de eliminación recibida</h1><p>Auto Artículos procesó la solicitud de eliminación de los datos asociados a Threads.</p><p>Código de confirmación: ${escapeHtml(confirmationCode)}</p></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}
