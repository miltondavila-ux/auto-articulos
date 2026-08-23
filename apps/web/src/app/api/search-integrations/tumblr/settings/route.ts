import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" };

export async function GET() {
  const user = await getCurrentUser();
  const [idSetting, secretSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "tumblr_client_id" } }),
    prisma.systemSetting.findUnique({ where: { key: "tumblr_client_secret" } }),
  ]);
  const envClientId = process.env.TUMBLR_CLIENT_ID;
  const envClientSecret = process.env.TUMBLR_CLIENT_SECRET;
  const configured = Boolean((idSetting && secretSetting) || (envClientId && envClientSecret));
  if (user.role !== "admin") return NextResponse.json({ configured, isAdmin: false }, { headers: NO_CACHE });
  const clientId = idSetting ? decryptSecret(idSetting.encryptedValue) : envClientId || null;
  return NextResponse.json({
    configured,
    isAdmin: true,
    clientId: clientId ? `${clientId.slice(0, 4)}...${clientId.slice(-4)}` : null,
    rawClientId: clientId ?? "",
    source: idSetting ? "database" : envClientId ? "environment" : "none",
  }, { headers: NO_CACHE });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (user.role !== "admin") return NextResponse.json({ error: "No autorizado." }, { status: 403, headers: NO_CACHE });
  const body = await request.json().catch(() => ({})) as { clientId?: unknown; clientSecret?: unknown };
  if (typeof body.clientId !== "string" || typeof body.clientSecret !== "string" || !body.clientId.trim() || !body.clientSecret.trim()) {
    return NextResponse.json({ error: "Debes ingresar el OAuth Consumer Key y el OAuth Consumer Secret de Tumblr." }, { status: 400, headers: NO_CACHE });
  }
  await Promise.all([
    prisma.systemSetting.upsert({ where: { key: "tumblr_client_id" }, create: { key: "tumblr_client_id", encryptedValue: encryptSecret(body.clientId.trim()) }, update: { encryptedValue: encryptSecret(body.clientId.trim()) } }),
    prisma.systemSetting.upsert({ where: { key: "tumblr_client_secret" }, create: { key: "tumblr_client_secret", encryptedValue: encryptSecret(body.clientSecret.trim()) }, update: { encryptedValue: encryptSecret(body.clientSecret.trim()) } }),
  ]);
  return NextResponse.json({ ok: true }, { headers: NO_CACHE });
}
