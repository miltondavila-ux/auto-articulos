import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { createBlueskySession, decryptSecret } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { canPublishToNetwork } from "@/lib/social-access";
import { NOT_CONNECTED, runConnectionTest } from "@/lib/connection-test-route";

export const dynamic = "force-dynamic";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "bluesky"))) {
    return NextResponse.json({ error: "Esta sección no está habilitada para tu cuenta. Pídele acceso al administrador." }, { status: 403 });
  }
  const integration = await prisma.blueskyIntegration.findUnique({ where: { userId }, select: { handle: true, encryptedAppPassword: true } });
  if (!integration) return NextResponse.json({ error: NOT_CONNECTED }, { status: 400 });
  return runConnectionTest("bluesky", async () => {
    const session = await createBlueskySession(integration.handle, decryptSecret(integration.encryptedAppPassword));
    return `@${session.handle || integration.handle}`;
  });
}
