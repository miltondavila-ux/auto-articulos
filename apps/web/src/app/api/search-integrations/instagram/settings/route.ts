import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const user = await getCurrentUser();

  const [idSetting, secretSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "instagram_app_id" } }),
    prisma.systemSetting.findUnique({ where: { key: "instagram_app_secret" } }),
  ]);

  const envAppId = process.env.INSTAGRAM_APP_ID;
  const envAppSecret = process.env.INSTAGRAM_APP_SECRET;

  const isConfigured = Boolean(
    (idSetting && secretSetting) || (envAppId && envAppSecret)
  );

  if (user.role !== "admin") {
    return NextResponse.json({
      configured: isConfigured,
      isAdmin: false,
    });
  }

  const appId = idSetting
    ? decryptSecret(idSetting.encryptedValue)
    : envAppId || null;

  return NextResponse.json({
    configured: isConfigured,
    isAdmin: true,
    appId: appId ? `${appId.slice(0, 4)}...${appId.slice(-4)}` : null,
    rawAppId: appId ?? "",
    source: idSetting ? "database" : envAppId ? "environment" : "none",
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "No autorizado. Solo los administradores pueden configurar las llaves de la API." },
      { status: 403 }
    );
  }

  const { appId, appSecret } = await request.json();

  if (typeof appId !== "string" || typeof appSecret !== "string" || !appId || !appSecret) {
    return NextResponse.json(
      { error: "Debes ingresar tanto el App ID como el App Secret de Meta." },
      { status: 400 }
    );
  }

  await Promise.all([
    prisma.systemSetting.upsert({
      where: { key: "instagram_app_id" },
      create: { key: "instagram_app_id", encryptedValue: encryptSecret(appId.trim()) },
      update: { encryptedValue: encryptSecret(appId.trim()) },
    }),
    prisma.systemSetting.upsert({
      where: { key: "instagram_app_secret" },
      create: { key: "instagram_app_secret", encryptedValue: encryptSecret(appSecret.trim()) },
      update: { encryptedValue: encryptSecret(appSecret.trim()) },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
