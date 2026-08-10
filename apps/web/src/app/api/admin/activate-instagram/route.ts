import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function POST() {
  try {
    await getCurrentUserId();
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const result = await prisma.user.updateMany({
    data: { allowInstagramPublishing: true },
  });

  return NextResponse.json({ success: true, updated: result.count });
}
