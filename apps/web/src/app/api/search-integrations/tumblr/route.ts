import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, getTumblrBlogs } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { canPublishToNetwork } from "@/lib/social-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" };

export async function GET() {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "tumblr"))) return NextResponse.json({ connected: false, forbidden: true }, { status: 403, headers: NO_CACHE });
  const integration = await prisma.tumblrIntegration.findUnique({ where: { userId } });
  if (!integration) return NextResponse.json({ connected: false }, { headers: NO_CACHE });
  let blogs = [{ identifier: integration.blogIdentifier, title: integration.blogTitle || integration.blogIdentifier }];
  try { blogs = await getTumblrBlogs(decryptSecret(integration.accessTokenEncrypted)); } catch { /* status still useful when Tumblr is temporarily unavailable */ }
  return NextResponse.json({ connected: true, blogIdentifier: integration.blogIdentifier, blogTitle: integration.blogTitle, expiresAt: integration.expiresAt, isExpired: Boolean(integration.expiresAt && integration.expiresAt < new Date()), blogs }, { headers: NO_CACHE });
}

export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "tumblr"))) return NextResponse.json({ error: "Tumblr no está habilitado para este usuario." }, { status: 403, headers: NO_CACHE });
  const body = await request.json().catch(() => ({})) as { blogIdentifier?: unknown };
  if (typeof body.blogIdentifier !== "string" || !body.blogIdentifier.trim()) return NextResponse.json({ error: "Selecciona un blog de Tumblr." }, { status: 400, headers: NO_CACHE });
  const integration = await prisma.tumblrIntegration.findUnique({ where: { userId } });
  if (!integration) return NextResponse.json({ error: "Tumblr no está conectado." }, { status: 400, headers: NO_CACHE });
  const blogs = await getTumblrBlogs(decryptSecret(integration.accessTokenEncrypted));
  const blog = blogs.find((item) => item.identifier === body.blogIdentifier);
  if (!blog) return NextResponse.json({ error: "El blog seleccionado no pertenece a la cuenta conectada." }, { status: 400, headers: NO_CACHE });
  await prisma.tumblrIntegration.update({ where: { userId }, data: { blogIdentifier: blog.identifier, blogTitle: blog.title } });
  return NextResponse.json({ ok: true, blogIdentifier: blog.identifier, blogTitle: blog.title }, { headers: NO_CACHE });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "tumblr"))) return NextResponse.json({ error: "Tumblr no está habilitado para este usuario." }, { status: 403, headers: NO_CACHE });
  await prisma.tumblrIntegration.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true }, { headers: NO_CACHE });
}
