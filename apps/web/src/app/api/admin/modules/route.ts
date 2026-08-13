import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { auditLog } from "@/lib/audit";
import {
  SYSTEM_MODULES,
  getGlobalDisabledModules,
  setGlobalDisabledModules,
} from "@/lib/modules";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const globalDisabledModules = await getGlobalDisabledModules();
  return NextResponse.json({
    modules: SYSTEM_MODULES,
    globalDisabledModules,
  });
}

export async function PATCH(request: NextRequest) {
  let adminId: string;
  try {
    adminId = (await requireAdmin()).id;
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { globalDisabledModules } = body;

    if (!Array.isArray(globalDisabledModules)) {
      return NextResponse.json(
        { error: "globalDisabledModules debe ser un arreglo de IDs" },
        { status: 400 },
      );
    }

    const validIds = new Set(SYSTEM_MODULES.map((m) => m.id));
    const filtered = globalDisabledModules.filter(
      (id): id is string => typeof id === "string" && validIds.has(id),
    );

    await setGlobalDisabledModules(filtered);
    auditLog("global_modules_updated", adminId, { globalDisabledModules: filtered });

    return NextResponse.json({
      success: true,
      globalDisabledModules: filtered,
    });
  } catch (error) {
    console.error("[admin/modules] PATCH error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la visibilidad global de módulos" },
      { status: 500 },
    );
  }
}
