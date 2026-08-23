import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";
import { listPinterestBoards } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";

export const dynamic = "force-dynamic";
const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" };

export async function GET() {
  const userId = await getCurrentUserId();
  const integration = await prisma.pinterestIntegration.findUnique({ where: { userId } });
  if (!integration) return NextResponse.json({ connected: false }, { headers: NO_CACHE });

  const isExpired = Boolean(integration.expiresAt && integration.expiresAt <= new Date());
  let boards: Array<{ id: string; name: string; privacy?: string }> = [];
  let boardsError: string | null = null;
  if (!isExpired) {
    try {
      const result = await listPinterestBoards(decryptSecret(integration.accessTokenEncrypted));
      boards = result.items || [];
    } catch (error) {
      boardsError = error instanceof Error ? error.message : String(error);
    }
  }
  return NextResponse.json({
    connected: true,
    pinterestUserId: integration.pinterestUserId,
    boardId: integration.boardId,
    boardName: integration.boardName,
    expiresAt: integration.expiresAt,
    isExpired,
    boards,
    boardsError,
  }, { headers: NO_CACHE });
}

export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId();
  const integration = await prisma.pinterestIntegration.findUnique({ where: { userId } });
  if (!integration) return NextResponse.json({ error: "Pinterest no está conectado." }, { status: 400 });
  const body = await request.json().catch(() => ({})) as { boardId?: unknown };
  if (typeof body.boardId !== "string" || !/^\d+$/.test(body.boardId)) {
    return NextResponse.json({ error: "Selecciona un tablero válido." }, { status: 400 });
  }
  const boards = await listPinterestBoards(decryptSecret(integration.accessTokenEncrypted));
  const board = boards.items.find((item) => item.id === body.boardId);
  if (!board) return NextResponse.json({ error: "El tablero seleccionado no pertenece a tu cuenta." }, { status: 400 });
  await prisma.pinterestIntegration.update({ where: { userId }, data: { boardId: board.id, boardName: board.name } });
  return NextResponse.json({ ok: true, boardId: board.id, boardName: board.name }, { headers: NO_CACHE });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  await prisma.pinterestIntegration.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true }, { headers: NO_CACHE });
}
