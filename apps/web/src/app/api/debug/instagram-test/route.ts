import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";

const GRAPH_API_VERSION = "v25.0";
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function GET() {
  try {
    const integration = await prisma.instagramIntegration.findFirst();
    if (!integration) {
      return NextResponse.json({ error: "No hay integración de Instagram" });
    }

    const accessToken = decryptSecret(integration.accessTokenEncrypted);

    // 1. Verificar token
    const tokenRes = await fetch(
      `${GRAPH_API_URL}/me?fields=id,name&access_token=${accessToken}`
    );
    const tokenData = await tokenRes.json();

    // 2. Verificar permisos
    const permsRes = await fetch(
      `${GRAPH_API_URL}/me/permissions?access_token=${accessToken}`
    );
    const permsData = await permsRes.json();

    // 3. Verificar páginas
    const pagesRes = await fetch(
      `${GRAPH_API_URL}/me/accounts?fields=id,name,access_token&access_token=${accessToken}`
    );
    const pagesData = await pagesRes.json();

    // 4. Probar creación de container con imagen de prueba
    const testImageUrl = "https://via.placeholder.com/1080x1080.png";
    const containerRes = await fetch(
      `${GRAPH_API_URL}/${integration.instagramBusinessAccountId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          media_type: "IMAGE",
          image_url: testImageUrl,
          caption: "Test post - will be deleted",
          access_token: accessToken,
        }).toString(),
      }
    );
    const containerData = await containerRes.json();

    return NextResponse.json({
      user: tokenData,
      permissions: permsData,
      pages: pagesData,
      testContainer: containerData,
      integration: {
        businessAccountId: integration.instagramBusinessAccountId,
        username: integration.instagramUsername,
        expiresAt: integration.expiresAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
