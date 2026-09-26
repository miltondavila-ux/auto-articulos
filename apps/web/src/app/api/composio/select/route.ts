import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { saveSelection } from "@/lib/composio-connections";
import { NO_STORE, errorResponse, forbidden, getComposioUserForApp, readJson } from "../_access";

export const dynamic = "force-dynamic";

/** Aprueba y guarda la elección. Se revalida contra Google/Meta antes de guardar. */
export async function POST(request: NextRequest) {
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  const user = await getComposioUserForApp(body.app);
  if (!user) return forbidden();
  try {
    const { sitemap } = await saveSelection(user, body.app, body.optionId);
    auditLog("composio.selection_saved", user.id, { app: body.app });
    return NextResponse.json({ ok: true, sitemap }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
