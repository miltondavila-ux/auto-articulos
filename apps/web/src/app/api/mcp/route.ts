import { NextRequest, NextResponse } from "next/server";
import {
  MCP_PROTOCOL_VERSION,
  RPC_INVALID_PARAMS,
  RPC_INVALID_REQUEST,
  RPC_METHOD_NOT_FOUND,
  RPC_PARSE_ERROR,
  rpcError,
  rpcResult,
  type JsonRpcRequest,
} from "@/lib/mcp/protocol";
import { findTool, listToolsPayload } from "@/lib/mcp/tools";

/**
 * Servidor MCP de Auto Artículos — transporte "streamable HTTP".
 *
 * Es el endpoint al que se conecta un cliente MCP (Alexa+ actúa como cliente;
 * también sirve para Claude, ChatGPT o cualquier otro). Alexa+ for Builders
 * exige la versión 2025-11-25 de la spec y este transporte, no stdio.
 *
 * La autenticación NO se hace acá: la resuelve el middleware, que valida el
 * Bearer y deja `x-user-id` en el request. Si no hay token válido, el
 * middleware corta con 401 antes de llegar a esta ruta — que es justo lo que
 * Alexa necesita para disparar el account linking por su cuenta.
 */

// Prisma no corre en Edge; estas tools van contra la base.
export const runtime = "nodejs";
// Cada llamada consulta datos vivos del usuario: nunca cachear.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: JsonRpcRequest | JsonRpcRequest[];
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(rpcError(null, RPC_PARSE_ERROR, "JSON inválido."), { status: 400 });
  }

  // La spec permite lotes. Se responde solo a los mensajes que traen `id`;
  // las notificaciones (sin `id`) no llevan respuesta.
  const mensajes = Array.isArray(body) ? body : [body];
  const scopes = request.headers.get("x-mcp-scopes")?.split(" ").filter(Boolean) ?? [];
  const respuestas = [];
  for (const mensaje of mensajes) {
    const respuesta = await manejar(mensaje, scopes);
    if (respuesta) respuestas.push(respuesta);
  }

  if (respuestas.length === 0) {
    // Solo había notificaciones (p. ej. notifications/initialized).
    return new NextResponse(null, { status: 202 });
  }
  return NextResponse.json(Array.isArray(body) ? respuestas : respuestas[0]);
}

async function manejar(mensaje: JsonRpcRequest, scopes: string[]) {
  const id = mensaje?.id ?? null;
  const esNotificacion = mensaje?.id === undefined;

  if (mensaje?.jsonrpc !== "2.0" || typeof mensaje.method !== "string") {
    return esNotificacion ? null : rpcError(id, RPC_INVALID_REQUEST, "Mensaje JSON-RPC inválido.");
  }

  switch (mensaje.method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "auto-articulos", version: "0.1.0" },
        instructions:
          "Herramientas de Auto Artículos: consultar y generar oportunidades SEO, y publicar artículos. Publicar tiene consecuencias públicas reales: usa siempre publicar_categoria con confirmar=false primero y pide confirmación explícita al usuario antes de publicar.",
      });

    // El cliente avisa que terminó el handshake. No espera respuesta.
    case "notifications/initialized":
      return null;

    case "ping":
      return rpcResult(id, {});

    case "tools/list":
      return rpcResult(id, { tools: listToolsPayload(scopes) });

    case "tools/call": {
      const nombre = mensaje.params?.name;
      if (typeof nombre !== "string") {
        return rpcError(id, RPC_INVALID_PARAMS, "Falta el nombre de la herramienta.");
      }
      const tool = findTool(nombre, scopes);
      if (!tool) {
        return rpcError(id, RPC_METHOD_NOT_FOUND, `No existe la herramienta "${nombre}".`);
      }
      try {
        const args = (mensaje.params?.arguments ?? {}) as Record<string, unknown>;
        return rpcResult(id, await tool.handler(args));
      } catch (error) {
        // Un fallo de la tool no debe tumbar la conversación: se reporta como
        // error de negocio para que el cliente lo lea en voz alta.
        console.error(`mcp: falló la herramienta ${nombre}`, error);
        return rpcResult(id, {
          content: [
            {
              type: "text",
              text: "Hubo un error interno al ejecutar esa acción. Inténtalo de nuevo en un momento.",
            },
          ],
          isError: true,
        });
      }
    }

    default:
      return esNotificacion
        ? null
        : rpcError(id, RPC_METHOD_NOT_FOUND, `Método no soportado: ${mensaje.method}`);
  }
}

/**
 * El transporte streamable HTTP contempla un GET para abrir un canal SSE de
 * mensajes iniciados por el servidor. Este servidor no envía nada por su
 * cuenta (no hay notificaciones ni sampling), así que se rechaza
 * explícitamente, que es la respuesta prevista por la spec para ese caso.
 */
export async function GET() {
  return new NextResponse("Este servidor MCP no ofrece stream SSE.", { status: 405 });
}
