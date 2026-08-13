/**
 * JSON-RPC 2.0 mínimo para MCP (spec 2025-11-25, la versión que exige
 * Alexa+ for Builders).
 *
 * No se usa @modelcontextprotocol/sdk a propósito: ese SDK está pensado para
 * el par (req, res) de Node, y acá las rutas de Next 16 trabajan con las APIs
 * web Request/Response. Envolverlo costaría más código que hablar el
 * protocolo directamente, y agregaría una dependencia al repo. El subconjunto
 * que un cliente MCP necesita de verdad es chico: initialize, tools/list y
 * tools/call.
 */

export const MCP_PROTOCOL_VERSION = "2025-11-25";

export type JsonRpcId = string | number | null;

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
};

/** Códigos estándar de JSON-RPC 2.0. */
export const RPC_PARSE_ERROR = -32700;
export const RPC_INVALID_REQUEST = -32600;
export const RPC_METHOD_NOT_FOUND = -32601;
export const RPC_INVALID_PARAMS = -32602;
export const RPC_INTERNAL_ERROR = -32603;

export function rpcResult(id: JsonRpcId, result: unknown) {
  return { jsonrpc: "2.0" as const, id, result };
}

export function rpcError(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: "2.0" as const, id, error: { code, message } };
}

/**
 * Resultado de una tool. MCP obliga a devolver el contenido como bloques;
 * `isError: true` le dice al cliente que la tool falló por una razón de
 * negocio (cupo excedido, falta credencial) sin romper la conversación —
 * distinto de un error de protocolo.
 */
export function toolText(text: string, isError = false) {
  return { content: [{ type: "text" as const, text }], isError };
}
