import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import {
  decryptSecret,
  encryptSecret,
  publishThread,
  refreshThreadsToken,
} from "@auto-articulos/shared";

async function publishToThreads(userId: string, suggestedText: string, articleUrl: string): Promise<{ postId: string; permalink?: string }> {
  if (!articleUrl) {
    throw new Error("El artículo no tiene URL publicada. Publica el artículo primero.");
  }

  const integration = await prisma.threadsIntegration.findUnique({
    where: { userId },
  });

  if (!integration) {
    throw new Error("Threads no está configurado en tu cuenta.");
  }

  let accessToken = decryptSecret(integration.accessTokenEncrypted);

  const daysUntilExpiration =
    (integration.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

  if (daysUntilExpiration < 7) {
    try {
      const refreshed = await refreshThreadsToken(accessToken);
      accessToken = refreshed.accessToken;
      const newExpiresAt = new Date(Date.now() + refreshed.expiresInSeconds * 1000);
      await prisma.threadsIntegration.update({
        where: { userId },
        data: {
          accessTokenEncrypted: encryptSecret(accessToken),
          expiresAt: newExpiresAt,
        },
      });
    } catch (refreshErr) {
      console.warn("No se pudo autorrefrescar el token de Threads:", refreshErr);
    }
  }

  let finalPost = suggestedText;
  if (finalPost.includes("[ENLACE]")) {
    finalPost = finalPost.replace("[ENLACE]", articleUrl);
  } else {
    finalPost = `${finalPost}\n\n${articleUrl}`;
  }

  const result = await publishThread(
    accessToken,
    integration.threadsUserId,
    finalPost
  );

  return {
    postId: result.postId,
    permalink: result.permalink,
  };
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id es requerido" }, { status: 400 });
    }

    const opp = await prisma.socialOpportunity.findFirst({
      where: { id, userId, status: "pending" },
    });

    if (!opp) {
      return NextResponse.json(
        { error: "Propuesta no encontrada o ya publicada" },
        { status: 404 }
      );
    }

    let publishResult: { postId: string; permalink?: string } | null = null;

    try {
      if (opp.platform === "threads") {
        publishResult = await publishToThreads(userId, opp.suggestedText, opp.articleUrl);
      } else {
        throw new Error(`Plataforma ${opp.platform} no soportada todavía.`);
      }

      const updated = await prisma.socialOpportunity.update({
        where: { id },
        data: {
          status: "published",
          postId: publishResult.permalink || publishResult.postId,
          publishedAt: new Date(),
          errorLog: null,
        },
      });

      return NextResponse.json({ success: true, opportunity: updated });
    } catch (publishError: any) {
      const msg = publishError.message || String(publishError);
      await prisma.socialOpportunity.update({
        where: { id },
        data: {
          status: "error",
          errorLog: msg,
        },
      });
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
