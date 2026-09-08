// Cliente MCP (Model Context Protocol) genérico para publicar contenido en
// plataformas de terceros (2026-09-07/08, "MCP 10MWS").
//
// No tiene nada específico de 10minutesWebsite/Tagcrush: es transporte
// JSON-RPC sobre HTTP + manejo de errores tipados. Lo específico de cada
// proveedor (nombres de herramientas, forma de los parámetros) vive en el
// publisher que lo use (ver apps/worker/src/automation/mcpPublisher.ts).
//
// Sin URL real todavía contra la que probar (el equipo de 10MWS no la
// entregó aún, ver MCP_DE_ARTICULOS_ESPECIFICACION.md) — este cliente se
// valida en tests contra un servidor JSON-RPC de prueba local.

export class McpError extends Error {
  constructor(
    /** Código estable en mayúsculas devuelto por el servidor MCP remoto
     * (ej. "TITULO_DUPLICADO", "CUPO_DIARIO_AGOTADO"), o "MCP_TRANSPORT"
     * si el error ocurrió antes de tener una respuesta JSON-RPC válida. */
    public readonly code: string,
    message: string,
    /** Segundos sugeridos de espera antes de reintentar (estilo
     * Retry-After), si el servidor lo indicó. */
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "McpError";
  }
}

export interface McpClientConfig {
  /** URL del servidor MCP remoto (endpoint único JSON-RPC). */
  serverUrl: string;
  /** Token de acceso OAuth ya vigente (el caller es responsable de
   * refrescarlo antes de llamar; este cliente no maneja refresh). */
  accessToken: string;
  /** Milisegundos antes de abortar una llamada. Por defecto 30s: el
   * contrato pide publicaciones de segundos, no los minutos que tarda hoy
   * el navegador. */
  timeoutMs?: number;
}

let requestCounter = 0;

/**
 * Invoca una herramienta MCP (`tools/call`) y devuelve su resultado ya
 * parseado. Traduce cualquier error JSON-RPC o de transporte a McpError,
 * para que el llamador nunca tenga que inspeccionar la forma cruda de la
 * respuesta.
 */
export async function callMcpTool<TResult = unknown>(
  config: McpClientConfig,
  toolName: string,
  args: Record<string, unknown>,
): Promise<TResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 30_000);
  let response: Response;
  try {
    response = await fetch(config.serverUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `mcp-${Date.now()}-${++requestCounter}`,
        method: "tools/call",
        params: { name: toolName, arguments: args },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new McpError("MCP_TRANSPORT", `Tiempo de espera agotado llamando a ${toolName}.`);
    }
    throw new McpError(
      "MCP_TRANSPORT",
      `No se pudo contactar al servidor MCP (${toolName}): ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 429) {
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
    throw new McpError(
      "LIMITE_PETICIONES",
      `El servidor MCP rechazó la llamada a ${toolName} por límite de peticiones.`,
      Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new McpError(
      "MCP_TRANSPORT",
      `Respuesta no-JSON del servidor MCP (${toolName}), HTTP ${response.status}.`,
    );
  }

  if (!response.ok) {
    throw new McpError(
      "MCP_TRANSPORT",
      `HTTP ${response.status} llamando a ${toolName}.`,
    );
  }

  const rpc = payload as {
    error?: { code?: unknown; message?: string; data?: { codigo?: string; retry_after_seconds?: number } };
    result?: unknown;
  };

  if (rpc.error) {
    const code = rpc.error.data?.codigo ?? String(rpc.error.code ?? "MCP_TRANSPORT");
    throw new McpError(code, rpc.error.message ?? `Error MCP en ${toolName}.`, rpc.error.data?.retry_after_seconds);
  }

  return rpc.result as TResult;
}
