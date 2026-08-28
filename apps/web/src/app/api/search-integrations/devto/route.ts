import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret, verifyDevToApiKey } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { canPublishToNetwork } from "@/lib/social-access";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET() {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "devto"))) return NextResponse.json({ connected: false, forbidden: true }, { status: 403, headers });
  const integration = await prisma.devToIntegration.findUnique({ where: { userId }, select: { username: true, updatedAt: true } });
  return NextResponse.json({ connected: Boolean(integration), username: integration?.username, updatedAt: integration?.updatedAt }, { headers });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "devto"))) return NextResponse.json({ error: "DEV.to no está habilitado para este usuario." }, { status: 403, headers });
  const body = await request.json().catch(() => ({})) as { apiKey?: unknown; username?: unknown };
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  if (!apiKey) return NextResponse.json({ error: "Debes ingresar la API key de DEV.to. DEV.to no permite usar la contraseña de la cuenta en su API." }, { status: 400, headers });
  try {
    const articles = await verifyDevToApiKey(apiKey);
    const verifiedUsername = articles[0]?.user?.username || username || null;
    await prisma.devToIntegration.upsert({ where: { userId }, create: { userId, username: verifiedUsername, encryptedApiKey: encryptSecret(apiKey) }, update: { username: verifiedUsername, encryptedApiKey: encryptSecret(apiKey) } });
    return NextResponse.json({ ok: true, username: verifiedUsername }, { headers });
  } catch {
    return NextResponse.json({ error: "No se pudo verificar la API key de DEV.to." }, { status: 400, headers });
  }
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "devto"))) return NextResponse.json({ error: "DEV.to no está habilitado para este usuario." }, { status: 403, headers });
  await prisma.devToIntegration.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true }, { headers });
}
