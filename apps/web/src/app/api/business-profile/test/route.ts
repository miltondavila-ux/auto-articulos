import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { NOT_CONNECTED, runConnectionTest } from "@/lib/connection-test-route";

export const dynamic = "force-dynamic";

/** Probar conexión de Google Business Profile: comprueba el estado guardado de la conexión activa. */
export async function POST() {
  const userId = await getCurrentUserId();
  const [postPeer, legacy] = await Promise.all([
    prisma.postPeerConnection.findUnique({ where: { userId }, select: { status: true, accountName: true, lastError: true } }),
    prisma.businessProfileIntegration.findUnique({ where: { userId }, select: { locationTitle: true, locationName: true } }),
  ]);
  const postPeerActive = postPeer?.status === "ACTIVE";
  if (!postPeerActive && !legacy) return NextResponse.json({ error: NOT_CONNECTED }, { status: 400 });
  return runConnectionTest("business-profile", async () => {
    if (postPeerActive) {
      if (postPeer?.lastError) throw new Error(postPeer.lastError);
      return postPeer?.accountName ?? null;
    }
    if (!legacy?.locationName) throw new Error("token expired");
    return legacy.locationTitle ?? null;
  });
}
