import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { createBlueskySession, encryptSecret } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { canPublishToNetwork } from "@/lib/social-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET() {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "bluesky"))) return NextResponse.json({ connected: false, forbidden: true }, { status: 403, headers: NO_CACHE });
  const integration = await prisma.blueskyIntegration.findUnique({ where: { userId }, select: { handle: true, updatedAt: true } });
  return NextResponse.json({ connected: Boolean(integration), handle: integration?.handle, updatedAt: integration?.updatedAt }, { headers: NO_CACHE });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "bluesky"))) return NextResponse.json({ error: "Bluesky no está habilitado para este usuario." }, { status: 403, headers: NO_CACHE });
  const body = await request.json().catch(() => ({})) as { handle?: unknown; appPassword?: unknown };
  const handle = typeof body.handle === "string" ? body.handle.trim() : "";
  const appPassword = typeof body.appPassword === "string" ? body.appPassword.trim() : "";
  if (!handle || !appPassword) return NextResponse.json({ error: "Debes ingresar tu usuario y App Password de Bluesky." }, { status: 400, headers: NO_CACHE });
  try {
    const session = await createBlueskySession(handle, appPassword);
    await prisma.blueskyIntegration.upsert({ where: { userId }, create: { userId, handle: session.handle || handle, encryptedAppPassword: encryptSecret(appPassword) }, update: { handle: session.handle || handle, encryptedAppPassword: encryptSecret(appPassword) } });
    return NextResponse.json({ ok: true, handle: session.handle || handle }, { headers: NO_CACHE });
  } catch {
    return NextResponse.json({ error: "No se pudo verificar la cuenta de Bluesky. Revisa el usuario y la App Password." }, { status: 400, headers: NO_CACHE });
  }
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "bluesky"))) return NextResponse.json({ error: "Bluesky no está habilitado para este usuario." }, { status: 403, headers: NO_CACHE });
  await prisma.blueskyIntegration.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true }, { headers: NO_CACHE });
}
