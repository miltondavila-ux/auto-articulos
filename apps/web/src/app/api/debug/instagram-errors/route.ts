import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";

export async function GET() {
  const jobs = await prisma.socialOpportunity.findMany({
    where: { platform: { contains: "instagram" } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      platform: true,
      status: true,
      errorLog: true,
      createdAt: true,
      publishedAt: true,
    },
  });

  return NextResponse.json(jobs);
}
