import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";

export async function GET() {
  await getCurrentUserId();

  const [idSetting, secretSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "threads_app_id" } }),
    prisma.systemSetting.findUnique({ where: { key: "threads_app_secret" } }),
  ]);

  const envAppId = process.env.THREADS_APP_ID;
  const envAppSecret = process.env.THREADS_APP_SECRET;

  const appId = idSetting
    ? decryptSecret(idSetting.encryptedValue)
    : envAppId || null;

  const isConfigured = Boolean(
    (idSetting && secretSetting) || (envAppId && envAppSecret)
  );

  return NextResponse.json({
    configured: isConfigured,
    appId: appId ? `${appId.slice(0, 4)}...${appId.slice(-4)}` : null,
    rawAppId: appId ?? "",
    source: idSetting ? "database" : envAppId ? "environment" : "none",
  });
}

export async function POST(request: NextRequest) {
  await getCurrentUserId();
  const { appId, appSecret } = await request.json();

  if (typeof appId !== "string" || typeof appSecret !== "string" || !appId || !appSecret) {
    return NextResponse.json(
      { error: "Debes ingresar tanto el App ID como el App Secret de Meta." },
      { status: 400 }
    );
  }

  await Promise.all([
    prisma.systemSetting.upsert({
      where: { key: "threads_app_id" },
      create: { key: "threads_app_id", encryptedValue: encryptSecret(appId.trim()) },
      update: { encryptedValue: encryptSecret(appId.trim()) },
    }),
    prisma.systemSetting.upsert({
      where: { key: "threads_app_secret" },
      create: { key: "threads_app_secret", encryptedValue: encryptSecret(appSecret.trim()) },
      update: { encryptedValue: encryptSecret(appSecret.trim()) },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
