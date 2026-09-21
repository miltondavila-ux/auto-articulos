import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const connection = await prisma.postPeerConnection.findUnique({ where: { userId: user.id }, select: { status: true, accountId: true, accountName: true, connectedAt: true, lastError: true } });
  return NextResponse.json(connection ?? { status: "DISCONNECTED", accountId: null, accountName: null, connectedAt: null, lastError: null }, { headers: { "Cache-Control": "no-store" } });
}
