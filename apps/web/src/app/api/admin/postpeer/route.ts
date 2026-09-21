import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/current-user";
import { deletePostPeerApiKey, getPostPeerApiKey, maskPostPeerApiKey, savePostPeerApiKey, testPostPeerConnection } from "@/lib/postpeer";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" };

export async function GET() {
  await requireAdmin();
  const key = await getPostPeerApiKey();
  return NextResponse.json(key ? { configured: true, maskedKey: maskPostPeerApiKey(key) } : { configured: false }, { headers: NO_STORE });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  const body = await request.json().catch(() => null) as { apiKey?: unknown } | null;
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (apiKey.length < 10 || /\s/.test(apiKey)) return NextResponse.json({ error: "La clave de PostPeer no es válida." }, { status: 400, headers: NO_STORE });
  try { await testPostPeerConnection(apiKey); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "PostPeer rechazó la clave." }, { status: 400, headers: NO_STORE }); }
  await savePostPeerApiKey(apiKey);
  auditLog("postpeer.api_key_saved", admin.id);
  return NextResponse.json({ configured: true, maskedKey: maskPostPeerApiKey(apiKey) }, { headers: NO_STORE });
}

export async function DELETE() {
  const admin = await requireAdmin();
  await deletePostPeerApiKey();
  auditLog("postpeer.api_key_deleted", admin.id);
  return NextResponse.json({ configured: false }, { headers: NO_STORE });
}
