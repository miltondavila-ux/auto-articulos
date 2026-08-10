import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";

export async function POST() {
  const result = await prisma.user.updateMany({
    data: { allowInstagramPublishing: true },
  });
  return NextResponse.json({ updated: result.count });
}
