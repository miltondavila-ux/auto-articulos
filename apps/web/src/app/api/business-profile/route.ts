import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getGoogleAccessToken,
  listBusinessAccounts,
  listBusinessLocations,
} from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";

async function integrationFor(userId: string) {
  return prisma.businessProfileIntegration.findUnique({ where: { userId } });
}

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const integration = await integrationFor(userId);
  if (!integration) return NextResponse.json({ connected: false });

  if (integration.locationName) {
    return NextResponse.json({
      connected: true,
      locationName: integration.locationName,
      locationTitle: integration.locationTitle,
    });
  }

  // Abrir Configuración no debe gastar cuota de Google. Las fichas se piden
  // únicamente cuando el usuario pulsa Buscar fichas disponibles.
  if (request.nextUrl.searchParams.get("locations") !== "1") {
    return NextResponse.json({
      connected: true,
      needsLocation: true,
      locations: [],
      locationsLoaded: false,
    });
  }

  try {
    const accessToken = await getGoogleAccessToken(
      decryptSecret(integration.encryptedRefreshToken),
    );
    const accounts = await listBusinessAccounts(accessToken);
    const locations: { accountName: string; locationName: string; locationTitle: string }[] = [];
    for (const account of accounts) {
      const accountLocations = await listBusinessLocations(accessToken, account.name);
      locations.push(
        ...accountLocations.map((location) => ({
          accountName: account.name,
          locationName: location.name,
          locationTitle: location.title,
        })),
      );
    }
    return NextResponse.json({
      connected: true,
      needsLocation: true,
      locations,
      locationsLoaded: true,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron consultar las fichas de Google.";
    return NextResponse.json({
      connected: true,
      needsLocation: true,
      locations: [],
      locationsLoaded: true,
      error: message,
    });
  }
}

export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId();
  const { accountName, locationName, locationTitle } = await request.json();
  if (
    typeof accountName !== "string" ||
    typeof locationName !== "string" ||
    typeof locationTitle !== "string" ||
    !accountName ||
    !locationName
  ) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  const integration = await integrationFor(userId);
  if (!integration)
    return NextResponse.json(
      { error: "Google Business Profile no está conectado." },
      { status: 404 },
    );

  // Se valida contra las ubicaciones reales de la cuenta (igual que
  // search-integrations/google valida contra las propiedades reales) para no
  // guardar una ubicación que no le pertenece a este usuario.
  const accessToken = await getGoogleAccessToken(
    decryptSecret(integration.encryptedRefreshToken),
  );
  const realLocations = await listBusinessLocations(accessToken, accountName);
  const selected = realLocations.find((l) => l.name === locationName);
  if (!selected) {
    return NextResponse.json(
      { error: "Esa ubicación no pertenece a esta cuenta." },
      { status: 403 },
    );
  }

  await prisma.businessProfileIntegration.update({
    where: { userId },
    data: { accountName, locationName, locationTitle: selected.title },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  await prisma.businessProfileIntegration.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true });
}
