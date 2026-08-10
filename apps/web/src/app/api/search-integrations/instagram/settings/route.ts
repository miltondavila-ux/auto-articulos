import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const user = await getCurrentUser();

  const [idSetting, secretSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "threads_app_id" } }),
    prisma.systemSetting.findUnique({ where: { key: "threads_app_secret" } }),
  ]);

  const envAppId = process.env.THREADS_APP_ID;
  const envAppSecret = process.env.THREADS_APP_SECRET;

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
