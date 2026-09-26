import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { canUseSocialModule } from "@/lib/social-access";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!(await canUseSocialModule(userId))) return NextResponse.json({ error: "Esta sección no está habilitada para tu cuenta. Pídele acceso al administrador." }, { status: 403 });
    const [opportunities, tumblrIntegration, composioConnections] = await Promise.all([
      prisma.socialOpportunity.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.tumblrIntegration.findUnique({ where: { userId }, select: { blogIdentifier: true } }),
      prisma.composioConnection.findMany({
        where: {
          userId,
          status: "ACTIVE",
          OR: [
            { app: "instagram", igAccountId: { not: null } },
            { app: "facebook", pageId: { not: null } },
          ],
        },
        select: { app: true },
      }),
    ]);
    const composioApps = new Set(composioConnections.map((connection) => connection.app));
    const history = opportunities.filter((opportunity) => {
      if (opportunity.platform === "instagram-story" && composioApps.has("instagram")) return false;
      if (opportunity.platform === "facebook-story" && composioApps.has("facebook")) return false;
      return true;
    }).map((opportunity) => {
      const tumblrPostMatch = opportunity.postId?.match(/\/post\/(\d+)(?:\/([^/?#]+))?/i);
      if (
        opportunity.status === "published" &&
        opportunity.platform === "tumblr" &&
        opportunity.postId &&
        tumblrIntegration?.blogIdentifier
      ) {
        return {
          ...opportunity,
          postId: tumblrPostMatch
            ? `https://www.tumblr.com/${tumblrIntegration.blogIdentifier}/${tumblrPostMatch[1]}${tumblrPostMatch[2] ? `/${tumblrPostMatch[2]}` : ""}`
            : (/^https?:\/\//i.test(opportunity.postId)
              ? opportunity.postId
              : `https://www.tumblr.com/${tumblrIntegration.blogIdentifier}/${opportunity.postId}`),
        };
      }
      return opportunity;
    });
    return NextResponse.json({ opportunities: history });
  } catch {
    return NextResponse.json({ error: "Error al obtener propuestas" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!(await canUseSocialModule(userId))) return NextResponse.json({ error: "Esta sección no está habilitada para tu cuenta. Pídele acceso al administrador." }, { status: 403 });
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id es requerido" },
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

    // Si es un descarte (skip)
    if (body.skip && body.skipReason) {
      const updated = await prisma.socialOpportunity.update({
        where: { id },
        data: {
          status: "skipped",
          skipReason: body.skipReason,
          errorLog: null,
        },
      });
      return NextResponse.json({ opportunity: updated });
    }

    // Si es solo actualización de texto
    if (typeof body.suggestedText === "string") {
      const updated = await prisma.socialOpportunity.update({
        where: { id },
        data: { suggestedText: body.suggestedText },
      });
      return NextResponse.json({ opportunity: updated });
    }

    return NextResponse.json(
      { error: "Envío inválido: falta suggestedText o skip+skipReason" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ error: "Error al actualizar propuesta" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!(await canUseSocialModule(userId))) return NextResponse.json({ error: "Esta sección no está habilitada para tu cuenta. Pídele acceso al administrador." }, { status: 403 });

    // scope=pending: usado por el botón "Borrar todas" de Oportunidades en
    // Redes Sociales, para borrar las propuestas pendientes. Sin ese
    // parámetro se mantiene el comportamiento original ("Borrar historial"
    // en /dashboard/historial): borra solo publicadas o con error. El scope
    // skipped permite borrar únicamente las propuestas descartadas desde
    // el bloque correspondiente de /dashboard/historial.
    const scope = request.nextUrl.searchParams.get("scope");
    await prisma.socialOpportunity.deleteMany({
      where:
        scope === "pending"
          ? { userId, status: "pending" }
          : scope === "skipped"
            ? { userId, status: "skipped" }
            : scope === "unconfirmed"
              ? { userId, status: { notIn: ["pending", "published", "skipped"] } }
          : { userId, status: { not: "pending" } },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar propuestas" }, { status: 500 });
  }
}
