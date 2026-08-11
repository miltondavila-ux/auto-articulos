import { prisma } from "@auto-articulos/db";
import { generateSocialImageRaw } from "@auto-articulos/shared";
import { put } from "@vercel/blob";

const SINGLE_IMAGE_PLATFORMS = new Set(["threads", "x", "linkedin"]);

/**
 * Toma una oportunidad pendiente que aún no tiene imagen (status="pending"
 * con imageUrl=null y plataforma de imagen única) y genera la imagen con
 * DALL-E / gpt-image-1, la sube a Vercel Blob y la guarda en imageUrl.
 * Si la generación falla, la deja sin imagen para que el usuario la pueda
 * aprobar igual (publicación se hará con sólo texto/enlace). Devuelve true
 * si trabajó, false si no había nada que hacer.
 *
 * Se ejecuta en el worker (no en Vercel Functions) para evitar timeouts,
 * porque la generación de imagen puede tomar más de 30 segundos.
 */
export async function processNextOpportunityImage(): Promise<boolean> {
  const opp = await prisma.socialOpportunity.findFirst({
    where: {
      status: "pending",
      platform: { in: Array.from(SINGLE_IMAGE_PLATFORMS) },
      OR: [{ imageUrl: null }, { imageUrl: "" }],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      platform: true,
      titleId: true,
      articleTitle: true,
      suggestedText: true,
      userId: true,
    },
  });

  if (!opp) return false;

  try {
    const [title, user] = await Promise.all([
      opp.titleId
        ? prisma.title.findUnique({
            where: { id: opp.titleId },
            select: { summary: true, finalTitle: true },
          })
        : Promise.resolve(null),
      prisma.user.findUnique({
        where: { id: opp.userId },
        select: { imagePrompt: true },
      }),
    ]);

    const imageBasis = title?.summary ?? title?.finalTitle ?? opp.articleTitle ?? opp.suggestedText;
    if (!imageBasis) {
      console.warn(`[opportunityImage] oportunidad ${opp.id} sin base para prompt, saltando`);
      return false;
    }

    const result = await generateSocialImageRaw(imageBasis, user?.imagePrompt);
    if (!result) {
      console.warn(`[opportunityImage] OpenAI no devolvió imagen para oportunidad ${opp.id}, se publicará sólo texto`);
      return false;
    }

    let imageUrl: string;
    if (result.url) {
      imageUrl = result.url;
    } else if (result.b64) {
      const buffer = Buffer.from(result.b64, "base64");
      const blob = await put(`social-opportunities/${opp.id}.png`, buffer, {
        access: "public",
        contentType: "image/png",
      });
      imageUrl = blob.url;
    } else {
      return false;
    }

    console.log(
      `[opportunityImage] oportunidad ${opp.id} (${opp.platform}) → imagen generada`,
    );

    await prisma.socialOpportunity.updateMany({
      where: { id: opp.id },
      data: { imageUrl },
    });
  } catch (err) {
    // Registrar pero no marcar error: la oportunidad seguirá pending sin imagen
    // y el usuario podrá decidir publicarla igualmente.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[opportunityImage] oportunidad ${opp.id} error (no fatal):`, message);
  }

  return true;
}
