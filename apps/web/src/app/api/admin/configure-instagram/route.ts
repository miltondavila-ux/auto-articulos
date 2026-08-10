import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function POST(request: NextRequest) {
  try {
    await getCurrentUserId();
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { enableForEmail } = await request.json();

  await prisma.user.updateMany({
    data: { allowInstagramPublishing: false },
  });

  if (enableForEmail && typeof enableForEmail === "string") {
    const result = await prisma.user.updateMany({
      where: { email: enableForEmail.trim().toLowerCase() },
      data: { allowInstagramPublishing: true },
    });
    return NextResponse.json({
      success: true,
      disabledAll: true,
      enabledFor: enableForEmail,
      found: result.count > 0,
    });
  }

  return NextResponse.json({ success: true, disabledAll: true });
}
