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
      return NextResponse.json({ error: "Esta sección no está habilitada para tu cuenta. Pídele acceso al administrador." }, { status: 403 });
    }
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id es requerido" }, { status: 400 });
    }

    // Se busca primero SIN filtrar por status para poder decir la razón
    // real si no se puede reintentar (antes decía siempre el mismo mensaje
    // genérico "no encontrada, ya publicada o en proceso" sin importar cuál
    // de esas tres causas era, dificultando saber si era un caso legítimo
    // (ya en cola) o un dato real inconsistente).
    const existing = await prisma.socialOpportunity.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Esta propuesta no existe o no pertenece a tu cuenta." },
        { status: 404 }
      );
    }

    // "skipped" = el usuario la descartó con el botón "Descartar" (no es un
    // error ni algo atascado); se permite reintentarla igual que Artículos
    // permite retomar un Run cancelado, por si cambia de opinión.
    if (!["pending", "error", "skipped"].includes(existing.status)) {
      const statusLabel =
        existing.status === "published"
          ? "ya está publicada"
          : existing.status === "queued"
          ? "está en cola, esperando al worker"
          : existing.status === "processing"
          ? "se está procesando ahora mismo"
          : `tiene un estado inesperado ("${existing.status}")`;
      return NextResponse.json(
        { error: `No se puede reintentar: ${statusLabel}. Actualiza la página para ver el estado real.` },
        { status: 409 }
      );
    }

    const opp = existing;
    // Algunas oportunidades antiguas fueron persistidas con el valor visible
    // normalizado en mayúsculas. La comparación canónica evita enviarlas al
    // worker social genérico: GBP siempre debe entrar por BusinessProfilePost.
    const platform = opp.platform.trim().toLowerCase();

    if (!opp.articleUrl) {
      return NextResponse.json(
        { error: "El artículo no tiene URL publicada. Publica el artículo primero." },
        { status: 400 }
      );
    }

    // Google Business Profile usa el lane específico de BusinessProfilePost
    // (incluido PostPeer), no el worker genérico de redes sociales.
    if (platform === "google-business") {
      if (!opp.titleId) {
        return NextResponse.json({ error: "La propuesta no está vinculada a un artículo publicable." }, { status: 400 });
      }
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, allowGoogleBusinessPublishing: true } });
      if (user?.role !== "admin" && !user?.allowGoogleBusinessPublishing) {
        return NextResponse.json({ error: "No tienes permiso para publicar en Google Business Profile. Contacta al administrador." }, { status: 403 });
      }
      await prisma.businessProfilePost.upsert({
        where: { titleId: opp.titleId },
        create: { titleId: opp.titleId, summary: "", ctaUrl: opp.articleUrl, status: "pending" },
        update: { status: "pending", googleResponse: null, sentAt: null },
      });
      await prisma.socialOpportunity.update({ where: { id }, data: { status: "queued", progressPercent: 1, progressStage: "En cola, esperando al worker de Google Business Profile", errorLog: null, startedAt: new Date(), finishedAt: null } });
      await triggerSocialWorkerNow();
      return NextResponse.json({ success: true, message: "Publicación encolada para Google Business Profile mediante PostPeer." });
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
      "devto",
      "blogger",
      "google-business",
      "instagram-carousel",
      "instagram-reel-image",
      "instagram-story",
      "instagram-infografia",
      "instagram-post",
    ];
    if (!supported.includes(platform)) {
      return NextResponse.json(
        { error: `Plataforma ${opp.platform} no soportada todavía.` },
        { status: 400 }
      );
    }

    if (platform.startsWith("instagram")) {
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

    if (platform === "threads") {
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

    if (platform === "blogger") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, allowBloggerPublishing: true },
      });
      if (user?.role !== "admin" && !user?.allowBloggerPublishing) {
        return NextResponse.json(
          { error: "No tienes permiso para publicar en Blogger. Contacta al administrador." },
          { status: 403 },
        );
      }
    }

    if (platform.startsWith("facebook-")) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, allowFacebookPublishing: true } });
      if (user?.role !== "admin" && !user?.allowFacebookPublishing) {
        return NextResponse.json({ error: "No tienes permiso para publicar en Facebook. Contacta al administrador." }, { status: 403 });
      }
    }

    if (platform === "pinterest" || platform === "tumblr" || platform === "bluesky" || platform === "devto") {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, allowPinterestPublishing: true, allowTumblrPublishing: true, allowBlueskyPublishing: true, allowDevToPublishing: true } });
      const allowed = platform === "pinterest" ? user?.role === "admin" || user?.allowPinterestPublishing : platform === "tumblr" ? user?.role === "admin" || user?.allowTumblrPublishing : platform === "bluesky" ? user?.role === "admin" || user?.allowBlueskyPublishing : user?.role === "admin" || user?.allowDevToPublishing;
      if (!allowed) return NextResponse.json({ error: `No tienes permiso para publicar en ${opp.platform}. Contacta al administrador.` }, { status: 403 });
    }

    await prisma.socialOpportunity.update({
      where: { id },
      data: {
        status: "queued",
        progressPercent: 1,
        progressStage: "En cola, esperando al worker",
        errorLog: null,
        // recoverStuckSocialOpportunities() mide "atascado" desde este
        // momento, no desde la creación original del registro (que en un
        // reintento de un registro viejo sería de hace días y lo marcaría
        // como atascado casi al instante). Ver cleanup.ts.
        startedAt: new Date(),
        finishedAt: null,
      },
    });

    // Esperar el dispatch garantiza que Vercel no cierre la función antes de
    // enviar la corrida a GitHub Actions. El estado ya está guardado, por lo
    // que aunque GitHub tarde, la corrida programada de respaldo la recoge.
    await triggerSocialWorkerNow();

    return NextResponse.json({
      success: true,
      message: platform.startsWith("instagram")
        ? "Publicación encolada. El sistema generará las imágenes y publicará en Instagram en segundo plano."
        : platform === "x"
        ? "Publicación encolada. El sistema generará la imagen y publicará en X (Twitter) en segundo plano."
        : platform === "linkedin"
        ? "Publicación encolada. El sistema publicará en LinkedIn en segundo plano."
        : platform === "facebook-page"
        ? "Publicación encolada. El sistema publicará en Facebook Pages en segundo plano."
        : platform === "facebook-story"
        ? "Publicación encolada. El sistema generará la imagen y publicará la Historia en Facebook en segundo plano."
        : platform === "pinterest"
        ? "Publicación encolada. El sistema publicará el Pin en Pinterest en segundo plano."
        : platform === "tumblr"
        ? "Publicación encolada. El sistema publicará el post en Tumblr en segundo plano."
        : platform === "bluesky"
        ? "Publicación encolada. El sistema publicará en Bluesky en segundo plano."
        : platform === "devto"
        ? "Publicación encolada. El sistema adaptará y publicará el artículo en DEV.to en segundo plano."
        : platform === "blogger"
        ? "Publicación encolada. El sistema publicará el artículo en Blogger en segundo plano."
        : platform === "google-business"
        ? "Publicación encolada. El sistema publicará el artículo en Google Business Profile mediante PostPeer en segundo plano."
        : "Publicación encolada. El sistema generará la imagen y publicará en Threads en segundo plano.",
    });
  } catch {
    return NextResponse.json({ error: "Error interno al publicar" }, { status: 500 });
  }
}
