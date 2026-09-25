import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { canUseComposioModule, completeConnection } from "@/lib/composio-connections";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

const CONNECTION_SLUG: Record<string, string> = {
  google_search_console: "google-search-console",
  google_analytics: "google-analytics",
  facebook: "facebook",
  instagram: "instagram",
};

/**
 * Vuelta desde Composio tras autorizar. `status` y `connected_account_id` vienen
 * por la URL y pueden falsificarse: completeConnection() los verifica contra
 * Composio y contra la conexión de ESTA persona antes de darla por buena.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const back = new URL("/dashboard/configuracion/conexiones", request.nextUrl.origin);
  const app = request.nextUrl.searchParams.get("app");
  const isMigrationApp = app === "google_search_console" || app === "google_analytics";
  if (!isMigrationApp && !canUseComposioModule(user)) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));
  }

  const outcome = await completeConnection(user, app, request.nextUrl.searchParams.get("connected_account_id"));
  auditLog("composio.connect_completed", user.id, { app, outcome });
  back.searchParams.set("resultado", outcome);
  if (app) {
    back.searchParams.set("app", app);
    const conexion = CONNECTION_SLUG[app];
    if (conexion) back.searchParams.set("conexion", conexion);
  }
  // ANALÍTICAS lee datos (Google); DIFUSIÓN publica (Facebook, Instagram).
  back.searchParams.set("vista", app === "facebook" || app === "instagram" ? "difusion" : "analiticas");
  return NextResponse.redirect(back);
}
