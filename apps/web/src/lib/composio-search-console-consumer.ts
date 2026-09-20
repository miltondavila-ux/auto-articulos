import { prisma } from "@auto-articulos/db";
import { methodFor, needsReconnectAlert, resolveConnection, type ConnectionState } from "@auto-articulos/shared";
import { getStoredComposioApiKey } from "./composio";
import { loadConnectionState } from "./composio-connection-state";

export async function resolveSearchConsoleForUser(userId: string, siteDomain: string): Promise<{
  state: ConnectionState;
  source: "OWN" | "COMPOSIO" | "NONE";
  apiKey: string | null;
  needsReconnect: boolean;
}> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, role: true, disabledModules: true } });
  const moduleEnabled = user.role === "admin" || (() => {
    try { return JSON.parse(user.disabledModules ?? "{}")?.["conexion-composio"] === "enabled"; }
    catch { return false; }
  })();
  const state = await loadConnectionState(userId, "google_search_console", siteDomain);
  const method = methodFor({ app: "google_search_console", userId, userEmail: user.email, moduleEnabled, routeIsComposio: false });
  const source = resolveConnection({ method, hasOwn: state.hasOwn, composio: state.composio }).source;
  return {
    state,
    source,
    apiKey: source === "COMPOSIO" ? await getStoredComposioApiKey() : null,
    needsReconnect: needsReconnectAlert({ app: "google_search_console", method, hasOwn: state.hasOwn, composio: state.composio }),
  };
}
