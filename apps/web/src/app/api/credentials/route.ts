import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";

const PLATFORM = "10minutesWebsite";

export async function GET() {
  const userId = await getCurrentUserId();
  const credential = await prisma.credential.findUnique({
    where: { userId_platform: { userId, platform: PLATFORM } },
    select: { updatedAt: true },
  });
  return NextResponse.json({ configured: Boolean(credential), updatedAt: credential?.updatedAt ?? null });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  const { username, password } = await request.json();

  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    return NextResponse.json({ error: "Usuario y contraseña son requeridos" }, { status: 400 });
  }

  await prisma.credential.upsert({
    where: { userId_platform: { userId, platform: PLATFORM } },
    create: {
      userId,
      platform: PLATFORM,
      encryptedUsername: encryptSecret(username),
      encryptedPassword: encryptSecret(password),
    },
    update: {
      encryptedUsername: encryptSecret(username),
      encryptedPassword: encryptSecret(password),
    },
  });

  return NextResponse.json({ ok: true });
}
