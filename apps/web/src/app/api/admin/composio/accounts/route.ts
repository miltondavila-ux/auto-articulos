import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import {
  ComposioError,
  getStoredComposioApiKey,
  listComposioConnectedAccounts,
} from "@/lib/composio";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" };

/** Cuentas de apps (Gmail, GitHub, etc.) conectadas en el proyecto Composio. */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403, headers: NO_STORE });
  }

  const apiKey = await getStoredComposioApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Primero guarda la clave de API de Composio." },
      { status: 409, headers: NO_STORE },
    );
  }

  try {
    const accounts = await listComposioConnectedAccounts(apiKey);
    return NextResponse.json({ accounts }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof ComposioError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status === null ? 502 : 400, headers: NO_STORE },
      );
    }
    throw error;
  }
}
