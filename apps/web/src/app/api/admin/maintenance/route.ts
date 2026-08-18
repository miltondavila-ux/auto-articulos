import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { getMaintenanceMode, setMaintenanceMode } from "@/lib/maintenance";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
  });
}

export async function GET() {
  try {
    await requireAdmin();
    return noStore({ enabled: await getMaintenanceMode() });
  } catch {
    return noStore({ error: "No autorizado" }, { status: 403 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    if (typeof body.enabled !== "boolean") {
      return noStore({ error: "enabled debe ser booleano" }, { status: 400 });
    }
    await setMaintenanceMode(body.enabled);
    return noStore({ success: true, enabled: body.enabled });
  } catch (error) {
    console.error("[admin/maintenance] error:", error);
    return noStore({ error: "No se pudo actualizar el modo de mantenimiento" }, { status: 500 });
  }
}
