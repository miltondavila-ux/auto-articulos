import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const opportunities = await prisma.socialOpportunity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ opportunities });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const { id, suggestedText } = await request.json();

    if (!id || typeof suggestedText !== "string") {
      return NextResponse.json(
        { error: "id y suggestedText son requeridos" },
        { status: 400 }
      );
    }

    const opp = await prisma.socialOpportunity.findFirst({
      where: { id, userId },
    });

    if (!opp) {
      return NextResponse.json(
        { error: "Propuesta no encontrada" },
        { status: 404 }
      );
    }

    const updated = await prisma.socialOpportunity.update({
      where: { id },
      data: { suggestedText },
    });

    return NextResponse.json({ opportunity: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
