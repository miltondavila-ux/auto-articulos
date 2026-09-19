/**
 * Cliente de la API de Composio para CONEXION COMPOSIO (Fase 2b).
 * Ver FASE_0_ARQUITECTURA_CONEXION_COMPOSIO.md §3, §7 y §8.
 *
 * Decisiones que fija este archivo:
 * - Las herramientas NO se ejecutan con `POST /tools/execute`: las claves de
 *   proyecto con permisos limitados no pueden (pide `tool_execution`, que el
 *   diálogo de creación no ofrece). Se usa el Tool Router: se crea una sesión
 *   (permiso `session_management` de escritura) y se ejecuta dentro de ella
 *   (permiso «Session tool execution»).
 * - La LISTA BLANCA vive solo aquí. `runAllowedTool` rechaza en código
 *   cualquier herramienta que no esté en COMPOSIO_TOOL_ALLOWLIST y además la
 *   sesión se crea con `tools.enable` para que Composio también la aplique.
 * - Nunca se registra ni se devuelve la clave de API.
 */

export const COMPOSIO_API_BASE = "https://backend.composio.dev/api/v3.1";

const REQUEST_TIMEOUT_MS = 20_000;

export type ComposioAppId =
  | "google_search_console"
  | "google_analytics"
  | "facebook"
  | "instagram";

export class ComposioApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly slug: string | null = null,
  ) {
    super(message);
    this.name = "ComposioApiError";
  }
}

interface ErrorBody {
  error?: { message?: string; slug?: string };
}

async function request<T>(
  apiKey: string,
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${COMPOSIO_API_BASE}${path}`, {
      method,
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    } as RequestInit);
  } catch {
    throw new ComposioApiError("No se pudo contactar a Composio.", null);
  }

  if (!response.ok) {
    let parsed: ErrorBody = {};
    try {
      parsed = (await response.json()) as ErrorBody;
    } catch {
      // cuerpo no JSON
    }
    if (response.status === 429) {
      const wait = Number(response.headers.get("Retry-After"));
      throw new ComposioApiError(
        `Composio alcanzó su límite de solicitudes${Number.isFinite(wait) && wait > 0 ? `; espera ${wait} s` : ""}.`,
        429,
        parsed.error?.slug ?? null,
      );
    }
    throw new ComposioApiError(
      parsed.error?.message ?? `Composio respondió con el error ${response.status}.`,
      response.status,
      parsed.error?.slug ?? null,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

// --- Lista blanca (Fase 0 §7) ---------------------------------------------

export interface AllowedTool {
  slug: string;
  kind: "read" | "write";
}

/**
 * Únicas herramientas que Auto Artículos puede ejecutar con las cuentas de los
 * clientes. Cualquier ampliación requiere un cambio de código y su revisión.
 * Bloqueadas a propósito: GOOGLE_SEARCH_CONSOLE_ADD_SITE / DELETE_SITE, las
 * herramientas de escritura de Analytics y todo lo de mensajería, comentarios
 * o administración de Facebook e Instagram.
 */
export const COMPOSIO_TOOL_ALLOWLIST: Record<ComposioAppId, readonly AllowedTool[]> = {
  google_search_console: [
    { slug: "GOOGLE_SEARCH_CONSOLE_LIST_SITES", kind: "read" },
    { slug: "GOOGLE_SEARCH_CONSOLE_LIST_SITEMAPS", kind: "read" },
    { slug: "GOOGLE_SEARCH_CONSOLE_SUBMIT_SITEMAP", kind: "write" },
    { slug: "GOOGLE_SEARCH_CONSOLE_INSPECT_URL", kind: "read" },
    { slug: "GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY", kind: "read" },
  ],
  google_analytics: [
    { slug: "GOOGLE_ANALYTICS_LIST_ACCOUNT_SUMMARIES", kind: "read" },
    { slug: "GOOGLE_ANALYTICS_LIST_ACCOUNTS", kind: "read" },
    { slug: "GOOGLE_ANALYTICS_LIST_PROPERTIES_FILTERED", kind: "read" },
    { slug: "GOOGLE_ANALYTICS_RUN_REPORT", kind: "read" },
  ],
  facebook: [
    { slug: "FACEBOOK_LIST_MANAGED_PAGES", kind: "read" },
    { slug: "FACEBOOK_CREATE_POST", kind: "write" },
    { slug: "FACEBOOK_CREATE_PHOTO_POST", kind: "write" },
  ],
  instagram: [
    { slug: "INSTAGRAM_GET_USER_INFO", kind: "read" },
    { slug: "INSTAGRAM_GET_IG_USER_CONTENT_PUBLISHING_LIMIT", kind: "read" },
    // media_type STORIES/REELS/CAROUSEL se elige por argumento (verificado en la
    // definición en vivo de la herramienta el 2026-09-19).
    { slug: "INSTAGRAM_POST_IG_USER_MEDIA", kind: "write" },
    { slug: "INSTAGRAM_CREATE_CAROUSEL_CONTAINER", kind: "write" },
    { slug: "INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH", kind: "write" },
  ],
};

/** Herramienta de solo lectura que usa el botón «Probar conexión» de cada app. */
export const COMPOSIO_TEST_TOOL: Record<ComposioAppId, string> = {
  google_search_console: "GOOGLE_SEARCH_CONSOLE_LIST_SITES",
  google_analytics: "GOOGLE_ANALYTICS_LIST_ACCOUNT_SUMMARIES",
  facebook: "FACEBOOK_LIST_MANAGED_PAGES",
  instagram: "INSTAGRAM_GET_USER_INFO",
};

export function isToolAllowed(app: ComposioAppId, toolSlug: string): boolean {
  return (COMPOSIO_TOOL_ALLOWLIST[app] ?? []).some((tool) => tool.slug === toolSlug);
}

// --- Conexión de cuentas -----------------------------------------------------

export interface ConnectLink {
  redirectUrl: string;
  connectedAccountId: string;
  expiresAt: string | null;
}

/** POST /connected_accounts/link (requiere escritura en «Connected accounts»). */
export async function createConnectLink(
  apiKey: string,
  input: { authConfigId: string; userId: string; callbackUrl: string },
): Promise<ConnectLink> {
  const body = await request<{
    redirect_url?: string;
    connected_account_id?: string;
    expires_at?: string;
  }>(apiKey, "POST", "/connected_accounts/link", {
    auth_config_id: input.authConfigId,
    user_id: input.userId,
    callback_url: input.callbackUrl,
  });
  if (!body.redirect_url || !body.connected_account_id) {
    throw new ComposioApiError("Composio no devolvió el enlace de conexión.", null);
  }
  return {
    redirectUrl: body.redirect_url,
    connectedAccountId: body.connected_account_id,
    expiresAt: body.expires_at ?? null,
  };
}

export interface ConnectedAccountInfo {
  id: string;
  status: string;
  userId: string | null;
  toolkitSlug: string | null;
  authConfigId: string | null;
}

export async function getConnectedAccount(
  apiKey: string,
  connectedAccountId: string,
): Promise<ConnectedAccountInfo> {
  const body = await request<{
    id?: string;
    status?: string;
    user_id?: string | null;
    toolkit?: { slug?: string } | null;
    auth_config?: { id?: string } | null;
  }>(apiKey, "GET", `/connected_accounts/${encodeURIComponent(connectedAccountId)}`);
  return {
    id: body.id ?? connectedAccountId,
    status: body.status ?? "UNKNOWN",
    userId: body.user_id ?? null,
    toolkitSlug: body.toolkit?.slug ?? null,
    authConfigId: body.auth_config?.id ?? null,
  };
}

export async function deleteConnectedAccount(
  apiKey: string,
  connectedAccountId: string,
): Promise<void> {
  await request(apiKey, "DELETE", `/connected_accounts/${encodeURIComponent(connectedAccountId)}`);
}

// --- Ejecución de herramientas por sesión -------------------------------------

const APP_TOOLKIT: Record<ComposioAppId, string> = {
  google_search_console: "google_search_console",
  google_analytics: "google_analytics",
  facebook: "facebook",
  instagram: "instagram",
};

export interface ToolResult {
  data: unknown;
  logId: string | null;
}

/**
 * Ejecuta UNA herramienta de la lista blanca con la cuenta conectada de un
 * cliente. Crea una sesión efímera de Tool Router limitada a ese toolkit, esa
 * cuenta y las herramientas permitidas, ejecuta y la elimina siempre.
 * Lanza ComposioApiError si la herramienta no está permitida (sin llamar a
 * Composio), si Composio falla o si la herramienta devuelve un error.
 */
export async function runAllowedTool(
  apiKey: string,
  input: {
    app: ComposioAppId;
    userId: string;
    connectedAccountId: string;
    toolSlug: string;
    args?: Record<string, unknown>;
  },
): Promise<ToolResult> {
  if (!isToolAllowed(input.app, input.toolSlug)) {
    throw new ComposioApiError(
      `La herramienta ${input.toolSlug} no está permitida para ${input.app}.`,
      null,
      "TOOL_NOT_ALLOWED",
    );
  }

  const toolkit = APP_TOOLKIT[input.app];
  const session = await request<{ session_id?: string }>(apiKey, "POST", "/tool_router/session", {
    user_id: input.userId,
    toolkits: { enable: [toolkit] },
    connected_accounts: { [toolkit]: [input.connectedAccountId] },
    tools: { [toolkit]: { enable: COMPOSIO_TOOL_ALLOWLIST[input.app].map((tool) => tool.slug) } },
    manage_connections: { enable: false },
  });
  if (!session.session_id) {
    throw new ComposioApiError("Composio no devolvió la sesión.", null);
  }

  try {
    const result = await request<{ data?: unknown; error?: string | null; log_id?: string }>(
      apiKey,
      "POST",
      `/tool_router/session/${encodeURIComponent(session.session_id)}/execute`,
      { tool_slug: input.toolSlug, arguments: input.args ?? {} },
    );
    if (result.error) {
      throw new ComposioApiError(String(result.error), null, "TOOL_ERROR");
    }
    return { data: result.data ?? null, logId: result.log_id ?? null };
  } finally {
    try {
      await request(apiKey, "DELETE", `/tool_router/session/${encodeURIComponent(session.session_id)}`);
    } catch {
      // La sesión caduca sola; no debe ocultar el resultado ni el error real.
    }
  }
}
