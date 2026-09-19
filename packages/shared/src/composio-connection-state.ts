import type { ComposioAppId } from "./composio";

/** Estado mínimo que necesitan los consumidores para decidir la vía de conexión. */
export interface ComposioConnectionSnapshot {
  status: string;
  hasSelection: boolean;
  connectedAccountId: string;
  siteUrl: string | null;
}

export interface ConnectionState {
  hasOwn: boolean;
  composio: ComposioConnectionSnapshot | null;
}

/**
 * Convierte las filas de Prisma en el estado estable que consume el resolvedor.
 * La selección de Search Console queda aprobada solo cuando existe dominio y URL.
 */
export function buildConnectionState(input: {
  own: { id: string } | null;
  composio: {
    status: string;
    connectedAccountId: string;
    siteDomain: string;
    siteUrl: string | null;
  } | null;
}): ConnectionState {
  return {
    hasOwn: input.own !== null,
    composio: input.composio
      ? {
          status: input.composio.status,
          hasSelection: Boolean(input.composio.siteDomain && input.composio.siteUrl),
          connectedAccountId: input.composio.connectedAccountId,
          siteUrl: input.composio.siteUrl,
        }
      : null,
  };
}

export interface ConnectionStateLoader {
  (userId: string, app: ComposioAppId, siteDomain?: string): Promise<ConnectionState>;
}
