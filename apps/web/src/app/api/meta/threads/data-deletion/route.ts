import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import {
  threadsUserIdFromPayload,
  verifyThreadsSignedRequest,
} from "@/lib/threads-meta-callback";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, callback: "threads-data-deletion" });
}

export async function POST(request: NextRequest) {
  const payload = await verifyThreadsSignedRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Solicitud de Meta no válida" }, { status: 400 });
  }

  const threadsUserId = threadsUserIdFromPayload(payload);
  if (threadsUserId) {
    // Los datos propios de Threads que guarda esta aplicación son la
    // vinculación y su token cifrado. La cuenta interna no se elimina porque
    // puede contener datos ajenos a Meta y debe gestionarse por separado.
    await prisma.threadsIntegration.deleteMany({ where: { threadsUserId } });
  }

  const confirmationCode = randomUUID();
  const statusUrl = new URL(
    "/api/meta/threads/data-deletion/status",
    request.url,
  );
  statusUrl.searchParams.set("confirmation_code", confirmationCode);

  return NextResponse.json({
    url: statusUrl.toString(),
    confirmation_code: confirmationCode,
  });
}
