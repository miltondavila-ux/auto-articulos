import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await getCurrentUserId();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const prompts = await prisma.prompt.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ prompts });
}
