import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { disconnectPostPeerBusinessConnection } from "@/lib/postpeer";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  await disconnectPostPeerBusinessConnection(user.id);
  return NextResponse.json({ ok: true });
}
