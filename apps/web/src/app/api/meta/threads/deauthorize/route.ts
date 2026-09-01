import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import {
  threadsUserIdFromPayload,
  verifyThreadsSignedRequest,
} from "@/lib/threads-meta-callback";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, callback: "threads-deauthorize" });
}

export async function POST(request: NextRequest) {
  const payload = await verifyThreadsSignedRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Solicitud de Meta no válida" }, { status: 400 });
  }

  const threadsUserId = threadsUserIdFromPayload(payload);
  if (threadsUserId) {
    // La desinstalación elimina el token y la vinculación de Threads, sin
    // borrar la cuenta interna del usuario ni sus datos de otras plataformas.
    await prisma.threadsIntegration.deleteMany({ where: { threadsUserId } });
  }

  return NextResponse.json({ ok: true });
}
