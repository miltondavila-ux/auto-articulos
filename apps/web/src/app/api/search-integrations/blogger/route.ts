import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret, getBloggerBlogs, refreshBloggerToken } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { bloggerOAuthConfig } from "@/lib/blogger-oauth";
import { canPublishToNetwork } from "@/lib/social-access";

const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" };

export async function GET() {
  const userId = await getCurrentUserId();
  const allowed = await canPublishToNetwork(userId, "blogger");
  if (!allowed) return NextResponse.json({ error: "Blogger no está habilitado para este usuario." }, { status: 403, headers: NO_CACHE });
  let integration = await prisma.bloggerIntegration.findUnique({ where: { userId } });
  if (!integration) return NextResponse.json({ connected: false }, { headers: NO_CACHE });
  if (integration.expiresAt && integration.expiresAt <= new Date() && integration.refreshTokenEncrypted) {
    try { const { clientId, clientSecret } = bloggerOAuthConfig(); const token = await refreshBloggerToken(decryptSecret(integration.refreshTokenEncrypted), clientId, clientSecret); integration = await prisma.bloggerIntegration.update({ where: { userId }, data: { accessTokenEncrypted: encryptSecret(token.access_token), expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null } }); } catch { /* status remains visible; user can reconnect */ }
  }
  let blogs = [{ id: integration.blogId, name: integration.blogName || integration.blogId }];
  try { blogs = await getBloggerBlogs(decryptSecret(integration.accessTokenEncrypted)); } catch { /* status remains useful */ }
  return NextResponse.json({ connected: true, blogId: integration.blogId, blogName: integration.blogName, expiresAt: integration.expiresAt, isExpired: Boolean(integration.expiresAt && integration.expiresAt <= new Date()), blogs }, { headers: NO_CACHE });
}

export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "blogger"))) return NextResponse.json({ error: "Blogger no está habilitado para este usuario." }, { status: 403, headers: NO_CACHE });
  const body = await request.json().catch(() => ({})) as { blogId?: unknown };
  if (typeof body.blogId !== "string" || !body.blogId.trim()) return NextResponse.json({ error: "Selecciona un blog de Blogger." }, { status: 400, headers: NO_CACHE });
  const integration = await prisma.bloggerIntegration.findUnique({ where: { userId } });
  if (!integration) return NextResponse.json({ error: "Blogger no está conectado." }, { status: 400, headers: NO_CACHE });
  const blogs = await getBloggerBlogs(decryptSecret(integration.accessTokenEncrypted));
  const blog = blogs.find((item) => item.id === body.blogId);
  if (!blog) return NextResponse.json({ error: "El blog seleccionado no pertenece a la cuenta conectada." }, { status: 400, headers: NO_CACHE });
  await prisma.bloggerIntegration.update({ where: { userId }, data: { blogId: blog.id, blogName: blog.name } });
  return NextResponse.json({ ok: true, blogId: blog.id, blogName: blog.name }, { headers: NO_CACHE });
}

export async function DELETE() { const userId = await getCurrentUserId(); if (!(await canPublishToNetwork(userId, "blogger"))) return NextResponse.json({ error: "Blogger no está habilitado para este usuario." }, { status: 403, headers: NO_CACHE }); await prisma.bloggerIntegration.deleteMany({ where: { userId } }); return NextResponse.json({ ok: true }, { headers: NO_CACHE }); }
