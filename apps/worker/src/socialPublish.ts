import { prisma } from "@auto-articulos/db";
import {
  buildImagePrompt,
  decryptSecret,
  encryptSecret,
  publishThread,
  refreshThreadsToken,
} from "@auto-articulos/shared";
import { put } from "@vercel/blob";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";

async function generateAndHostImage(titleId: string, summary: string): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  const prompt = buildImagePrompt(summary);
  const models = ["gpt-image-1", "dall-e-3"];
  for (const model of models) {
    try {
      const response = await fetch(OPENAI_IMAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model, prompt, size: "1024x1024", n: 1 }),
      });
      const data = (await response.json()) as { data?: { url?: string; b64_json?: string }[] };
      const imageUrl = data.data?.[0]?.url;
      const b64 = data.data?.[0]?.b64_json;
      let buffer: Buffer;
      if (b64) {
        buffer = Buffer.from(b64, "base64");
      } else if (imageUrl) {
        const imgRes = await fetch(imageUrl);
        buffer = Buffer.from(await imgRes.arrayBuffer());
      } else {
        continue;
      }
      const blob = await put(`threads/${titleId}.png`, buffer, { access: "public", contentType: "image/png" });
      return blob.url;
    } catch (err) {
      console.warn(`Fallo al generar imagen para Threads con modelo ${model}:`, err);
    }
  }
  return null;
}

export async function processNextSocialPublish(): Promise<boolean> {
  const job = await prisma.socialOpportunity.findFirst({
    where: { status: "queued", platform: "threads" },
    orderBy: { createdAt: "asc" },
  });

  if (!job) return false;

  try {
    await prisma.socialOpportunity.update({
      where: { id: job.id },
      data: { status: "processing" },
    });

    const integration = await prisma.threadsIntegration.findUnique({
      where: { userId: job.userId },
    });

    if (!integration) {
      throw new Error("Threads no está configurado en tu cuenta.");
    }

    let accessToken = decryptSecret(integration.accessTokenEncrypted);

    const daysUntilExpiration =
      (integration.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

    if (daysUntilExpiration < 7) {
      const refreshed = await refreshThreadsToken(accessToken);
      accessToken = refreshed.accessToken;
      const newExpiresAt = new Date(Date.now() + refreshed.expiresInSeconds * 1000);
      await prisma.threadsIntegration.update({
        where: { userId: job.userId },
        data: {
          accessTokenEncrypted: encryptSecret(accessToken),
          expiresAt: newExpiresAt,
        },
      });
    }

    let finalPost = job.suggestedText;
    if (finalPost.includes("[ENLACE]")) {
      finalPost = finalPost.replace("[ENLACE]", job.articleUrl);
    } else {
      finalPost = `${finalPost}\n\n${job.articleUrl}`;
    }

    let imageUrl: string | undefined;
    if (job.titleId) {
      const title = await prisma.title.findUnique({ where: { id: job.titleId } });
      if (title?.summary) {
        imageUrl = (await generateAndHostImage(job.titleId, title.summary)) ?? undefined;
      }
    }

    const result = await publishThread(accessToken, integration.threadsUserId, finalPost, imageUrl);

    await prisma.socialOpportunity.update({
      where: { id: job.id },
      data: {
        status: "published",
        postId: result.permalink || result.postId,
        publishedAt: new Date(),
        errorLog: null,
      },
    });

    console.log(`Publicado en Threads: ${job.id} — postId: ${result.postId}`);

    if (job.titleId) {
      await prisma.titleEvent.create({
        data: {
          titleId: job.titleId,
          message: `Publicado exitosamente en Meta Threads (@${integration.threadsUsername || integration.threadsUserId}) - ID: ${result.postId}${imageUrl ? " (con imagen)" : " (solo texto)"}`,
        },
      });
    }

    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error publicando oportunidad ${job.id}:`, errorMsg);

    await prisma.socialOpportunity.update({
      where: { id: job.id },
      data: { status: "error", errorLog: errorMsg },
    });

    if (job.titleId) {
      await prisma.titleEvent.create({
        data: {
          titleId: job.titleId,
          message: `Publicación en Meta Threads falló: ${errorMsg}`,
        },
      });
    }

    return true;
  }
}
