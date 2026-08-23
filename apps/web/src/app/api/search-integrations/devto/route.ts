import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret, verifyDevToApiKey } from "@auto-articulos/shared";
import { getCurrentUser, getCurrentUserId } from "@/lib/current-user";
import { canPublishToNetwork } from "@/lib/social-access";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET() {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "devto"))) return NextResponse.json({ connected: false, forbidden: true }, { status: 403, headers });
  const setting = await prisma.systemSetting.findUnique({ where: { key: "devto_api_key" }, select: { updatedAt: true } });
  return NextResponse.json({ connected: Boolean(setting), updatedAt: setting?.updatedAt }, { headers });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (user.role !== "admin") return NextResponse.json({ error: "Solo el administrador puede configurar la API key global de DEV.to." }, { status: 403, headers });
  const body = await request.json().catch(() => ({})) as { apiKey?: unknown };
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (!apiKey) return NextResponse.json({ error: "Debes ingresar tu API key de DEV.to." }, { status: 400, headers });
  try {
    const articles = await verifyDevToApiKey(apiKey);
    await prisma.systemSetting.upsert({ where: { key: "devto_api_key" }, create: { key: "devto_api_key", encryptedValue: encryptSecret(apiKey) }, update: { encryptedValue: encryptSecret(apiKey) } });
    const username = articles[0]?.user?.username || null;
    return NextResponse.json({ ok: true, username }, { headers });
  } catch {
    return NextResponse.json({ error: "No se pudo verificar la API key de DEV.to." }, { status: 400, headers });
  }
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (user.role !== "admin") return NextResponse.json({ error: "Solo el administrador puede desconectar la API key global de DEV.to." }, { status: 403, headers });
  await prisma.systemSetting.deleteMany({ where: { key: "devto_api_key" } });
  return NextResponse.json({ ok: true }, { headers });
}
