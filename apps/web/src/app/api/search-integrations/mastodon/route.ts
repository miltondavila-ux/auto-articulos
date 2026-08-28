import { NextRequest, NextResponse } from "next/server";
import { encryptSecret, verifyMastodonToken } from "@auto-articulos/shared";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { canPublishToNetwork } from "@/lib/social-access";

export const dynamic = "force-dynamic";
const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET() {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "mastodon"))) return NextResponse.json({ connected: false, forbidden: true }, { status: 403, headers: NO_CACHE });
  const integration = await prisma.mastodonIntegration.findUnique({ where: { userId }, select: { instanceUrl: true, username: true, displayName: true, updatedAt: true } });
  return NextResponse.json({ connected: Boolean(integration), ...integration }, { headers: NO_CACHE });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "mastodon"))) return NextResponse.json({ error: "Mastodon no está habilitado para este usuario." }, { status: 403, headers: NO_CACHE });
  const body = await request.json().catch(() => ({})) as { instanceUrl?: unknown; accessToken?: unknown };
  const instanceUrl = typeof body.instanceUrl === "string" ? body.instanceUrl.trim().replace(/\/+$/, "") : "";
  const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
  if (!/^https?:\/\/[^\s/]+$/i.test(instanceUrl) || !accessToken) return NextResponse.json({ error: "Indica la URL de tu instancia y el Access Token." }, { status: 400, headers: NO_CACHE });
  try {
    const account = await verifyMastodonToken(instanceUrl, accessToken);
    await prisma.mastodonIntegration.upsert({ where: { userId }, create: { userId, instanceUrl, username: account.username, displayName: account.display_name, accessTokenEncrypted: encryptSecret(accessToken) }, update: { instanceUrl, username: account.username, displayName: account.display_name, accessTokenEncrypted: encryptSecret(accessToken) } });
    return NextResponse.json({ ok: true, username: account.username, displayName: account.display_name, instanceUrl }, { headers: NO_CACHE });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    const errorMessage = detail.includes("(401)")
      ? "El Access Token no es válido o no pertenece a una cuenta. Copia el Access Token de usuario, no el Client Key ni el Client Secret."
      : detail.includes("(403)")
        ? "El Access Token no tiene permisos suficientes. Verifica profile, write:statuses y write:media."
        : detail.includes("(404)")
          ? "No se encontró esa instancia. Comprueba la URL, por ejemplo https://mastodon.social."
          : "No se pudo verificar Mastodon. Revisa la instancia y el Access Token.";
    return NextResponse.json({ error: errorMessage }, { status: 400, headers: NO_CACHE });
  }
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "mastodon"))) return NextResponse.json({ error: "Mastodon no está habilitado para este usuario." }, { status: 403, headers: NO_CACHE });
  await prisma.mastodonIntegration.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true }, { headers: NO_CACHE });
}
