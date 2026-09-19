import { prisma } from "@auto-articulos/db";
import {
  buildConnectionState,
  type ComposioAppId,
  type ConnectionState,
} from "@auto-articulos/shared";

/** Lee el estado de GSC propio y Composio sin alterar ninguna integración. */
export async function loadConnectionState(
  userId: string,
  app: ComposioAppId,
  siteDomain?: string,
): Promise<ConnectionState> {
  if (app !== "google_search_console") {
    return { hasOwn: false, composio: null };
  }

  const ownWhere = {
    userId,
    provider: "google",
    ...(siteDomain ? { siteDomain } : {}),
  };
  const composioWhere = {
    userId,
    app,
    ...(siteDomain ? { siteDomain } : {}),
  };
  const [own, composio] = await Promise.all([
    prisma.searchIntegration.findFirst({ where: ownWhere, select: { id: true } }),
    prisma.composioConnection.findFirst({
      where: composioWhere,
      orderBy: { updatedAt: "desc" },
      select: { status: true, connectedAccountId: true, siteDomain: true, siteUrl: true },
    }),
  ]);
  return buildConnectionState({ own, composio });
}
