import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, getTumblrBlogs } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { canPublishToNetwork } from "@/lib/social-access";
import { NOT_CONNECTED, runConnectionTest } from "@/lib/connection-test-route";

export const dynamic = "force-dynamic";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "tumblr"))) {
    return NextResponse.json({ error: "Esta sección no está habilitada para tu cuenta. Pídele acceso al administrador." }, { status: 403 });
  }
  const integration = await prisma.tumblrIntegration.findUnique({ where: { userId } });
  if (!integration) return NextResponse.json({ error: NOT_CONNECTED }, { status: 400 });
  return runConnectionTest("tumblr", async () => {
    await getTumblrBlogs(decryptSecret(integration.accessTokenEncrypted));
    return integration.blogTitle || integration.blogIdentifier;
  });
}
