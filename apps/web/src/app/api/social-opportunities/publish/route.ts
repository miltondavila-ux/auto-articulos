import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { canUseSocialModule } from "@/lib/social-access";
import { triggerSocialWorkerNow } from "@/lib/trigger-worker";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!(await canUseSocialModule(userId))) {
      return NextResponse.json({ error: "Módulo reservado a administradores y Lorena." }, { status: 403 });
    }
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

    if (!opp.articleUrl) {
      return NextResponse.json(
        { error: "El artículo no tiene URL publicada. Publica el artículo primero." },
        { status: 400 }
      );
    }

    const supported = [
      "threads",
      "x",
      "linkedin",
      "facebook-page",
      "facebook-story",
      "pinterest",
      "tumblr",
      "bluesky",
      "mastodon",
      "devto",
      "instagram-carousel",
      "instagram-reel-image",
      "instagram-story",
      "instagram-infografia",
      "instagram-post",
    ];
    if (!supported.includes(opp.platform)) {
      return NextResponse.json(
        { error: `Plataforma ${opp.platform} no soportada todavía.` },
        { status: 400 }
      );
    }

    if (opp.platform.startsWith("instagram")) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { allowInstagramPublishing: true },
      });
      if (!user?.allowInstagramPublishing) {
        return NextResponse.json(
          { error: "No tienes permiso para publicar en Instagram. Contacta al administrador." },
          { status: 403 }
        );
      }
    }

    if (opp.platform === "threads") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, allowThreadsPublishing: true },
      });
      if (user?.role !== "admin" && !user?.allowThreadsPublishing) {
        return NextResponse.json(
          { error: "No tienes permiso para publicar en Threads. Contacta al administrador." },
          { status: 403 },
        );
      }
    }

    if (opp.platform.startsWith("facebook-")) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role !== "admin") {
        return NextResponse.json({ error: "Facebook Pages está disponible solo para usuarios administradores." }, { status: 403 });
      }
    }

    if (opp.platform === "pinterest" || opp.platform === "tumblr" || opp.platform === "bluesky" || opp.platform === "mastodon" || opp.platform === "devto") {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, allowPinterestPublishing: true, allowTumblrPublishing: true, allowBlueskyPublishing: true, allowMastodonPublishing: true, allowDevToPublishing: true } });
      const allowed = opp.platform === "pinterest" ? user?.role === "admin" || user?.allowPinterestPublishing : opp.platform === "tumblr" ? user?.role === "admin" || user?.allowTumblrPublishing : opp.platform === "bluesky" ? user?.role === "admin" || user?.allowBlueskyPublishing : opp.platform === "mastodon" ? user?.role === "admin" || user?.allowMastodonPublishing : user?.role === "admin" || user?.allowDevToPublishing;
      if (!allowed) return NextResponse.json({ error: `No tienes permiso para publicar en ${opp.platform}. Contacta al administrador.` }, { status: 403 });
    }

    await prisma.socialOpportunity.update({
      where: { id },
      data: { status: "queued", progressPercent: 1, progressStage: "En cola, esperando al worker", errorLog: null },
    });

    // Esperar el dispatch garantiza que Vercel no cierre la función antes de
    // enviar la corrida a GitHub Actions. El estado ya está guardado, por lo
    // que aunque GitHub tarde, la corrida programada de respaldo la recoge.
    await triggerSocialWorkerNow();

    return NextResponse.json({
      success: true,
      message: opp.platform.startsWith("instagram")
        ? "Publicación encolada. El sistema generará las imágenes y publicará en Instagram en segundo plano."
        : opp.platform === "x"
        ? "Publicación encolada. El sistema generará la imagen y publicará en X (Twitter) en segundo plano."
        : opp.platform === "linkedin"
        ? "Publicación encolada. El sistema publicará en LinkedIn en segundo plano."
        : opp.platform === "facebook-page"
        ? "Publicación encolada. El sistema publicará en Facebook Pages en segundo plano."
        : opp.platform === "facebook-story"
        ? "Publicación encolada. El sistema generará la imagen y publicará la Historia en Facebook en segundo plano."
        : opp.platform === "pinterest"
        ? "Publicación encolada. El sistema publicará el Pin en Pinterest en segundo plano."
        : opp.platform === "tumblr"
        ? "Publicación encolada. El sistema publicará el post en Tumblr en segundo plano."
        : opp.platform === "bluesky"
        ? "Publicación encolada. El sistema publicará en Bluesky en segundo plano."
        : opp.platform === "devto"
        ? "Publicación encolada. El sistema adaptará y publicará el artículo en DEV.to en segundo plano."
        : "Publicación encolada. El sistema generará la imagen y publicará en Threads en segundo plano.",
    });
  } catch {
    return NextResponse.json({ error: "Error interno al publicar" }, { status: 500 });
  }
}
