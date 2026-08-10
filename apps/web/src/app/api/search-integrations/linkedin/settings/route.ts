import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const user = await getCurrentUser();

  const [idSetting, secretSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "linkedin_client_id" } }),
    prisma.systemSetting.findUnique({ where: { key: "linkedin_client_secret" } }),
  ]);

  const envClientId = process.env.LINKEDIN_CLIENT_ID;
  const envClientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  const isConfigured = Boolean(
    (idSetting && secretSetting) || (envClientId && envClientSecret)
  );

  if (user.role !== "admin") {
    return NextResponse.json({
      configured: isConfigured,
      isAdmin: false,
    });
  }

  const clientId = idSetting
    ? decryptSecret(idSetting.encryptedValue)
    : envClientId || null;

  return NextResponse.json({
    configured: isConfigured,
    isAdmin: true,
    clientId: clientId ? `${clientId.slice(0, 4)}...${clientId.slice(-4)}` : null,
    rawClientId: clientId ?? "",
    source: idSetting ? "database" : envClientId ? "environment" : "none",
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

  const { clientId, clientSecret } = await request.json();

  if (typeof clientId !== "string" || typeof clientSecret !== "string" || !clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Debes ingresar tanto el Client ID como el Client Secret de LinkedIn." },
      { status: 400 }
    );
  }

  await Promise.all([
    prisma.systemSetting.upsert({
      where: { key: "linkedin_client_id" },
      create: { key: "linkedin_client_id", encryptedValue: encryptSecret(clientId.trim()) },
      update: { encryptedValue: encryptSecret(clientId.trim()) },
    }),
    prisma.systemSetting.upsert({
      where: { key: "linkedin_client_secret" },
      create: { key: "linkedin_client_secret", encryptedValue: encryptSecret(clientSecret.trim()) },
      update: { encryptedValue: encryptSecret(clientSecret.trim()) },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
