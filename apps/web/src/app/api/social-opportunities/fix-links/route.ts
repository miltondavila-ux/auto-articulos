import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("x-fix-auth");
    if (authHeader !== "milton-fix-2026") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    console.log("Iniciando corrección de enlaces del historial...");
    let updatedOpps = 0;
    let updatedTitles = 0;

    // 1. Corregir SocialOpportunity
    const opps = await prisma.socialOpportunity.findMany({
      where: {
        status: "published",
        postId: { not: null },
      },
    });

    const pendingOpps = opps.filter((o) => o.postId && !o.postId.startsWith("http"));
    console.log(`Encontradas ${pendingOpps.length} propuestas de redes con IDs numéricos.`);

    for (const opp of pendingOpps) {
      const integration = await prisma.threadsIntegration.findUnique({
        where: { userId: opp.userId },
      });

      if (!integration) continue;

      const accessToken = decryptSecret(integration.accessTokenEncrypted);
      const res = await fetch(
        `https://graph.threads.net/v1.0/${opp.postId}?fields=permalink&access_token=${accessToken}`
      );

      if (res.ok) {
        const data = (await res.json()) as { permalink?: string };
        if (data.permalink) {
          await prisma.socialOpportunity.update({
            where: { id: opp.id },
            data: { postId: data.permalink },
          });
          updatedOpps++;
        }
      }
    }

    // 2. Corregir Title
    const titles = await prisma.title.findMany({
      where: {
        threadsPublishStatus: "success",
        threadsPostId: { not: null },
      },
    });

    const pendingTitles = titles.filter((t) => t.threadsPostId && !t.threadsPostId.startsWith("http"));
    console.log(`Encontrados ${pendingTitles.length} artículos con IDs numéricos.`);

    for (const title of pendingTitles) {
      const run = await prisma.run.findFirst({
        where: {
          titles: { some: { id: title.id } },
        },
        select: { userId: true },
      });

      if (!run?.userId) continue;

      const integration = await prisma.threadsIntegration.findUnique({
        where: { userId: run.userId },
      });

      if (!integration) continue;

      const accessToken = decryptSecret(integration.accessTokenEncrypted);
      const res = await fetch(
        `https://graph.threads.net/v1.0/${title.threadsPostId}?fields=permalink&access_token=${accessToken}`
      );

      if (res.ok) {
        const data = (await res.json()) as { permalink?: string };
        if (data.permalink) {
          await prisma.title.update({
            where: { id: title.id },
            data: { threadsPostId: data.permalink },
          });
          updatedTitles++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Enlaces corregidos con éxito. Redes actualizadas: ${updatedOpps}. Artículos actualizados: ${updatedTitles}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
