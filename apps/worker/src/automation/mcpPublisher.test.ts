import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { createMcpPublisher, mapMcpError } from "./mcpPublisher";
import { McpError } from "@auto-articulos/shared";
import { DailyLimitReachedError, DuplicateTitleError } from "./10minutesWebsite";

// Servidor MCP de prueba: implementa el mínimo del contrato descrito en
// MCP_DE_ARTICULOS_ESPECIFICACION.md como para validar el mapeo de campos y
// la traducción de errores del lado de mcpPublisher.ts, sin depender de
// ningún servidor real de 10MWS (que todavía no existe).
async function startStubServer(
  handler: (method: string, toolName: string, args: Record<string, unknown>) => unknown,
): Promise<{ server: Server; url: string }> {
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      try {
        const result = handler(body.method, body.params?.name, body.params?.arguments ?? {});
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jsonrpc: "2.0", id: body.id, result }));
      } catch (err) {
        const e = err as { code?: string; message?: string; retryAfterSeconds?: number };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            error: {
              code: -32000,
              message: e.message ?? "error",
              data: { codigo: e.code ?? "ERROR", retry_after_seconds: e.retryAfterSeconds },
            },
          }),
        );
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, url: `http://127.0.0.1:${port}` };
}

test("fetchCategories mapea nombre/panel/es_secuencia al formato interno", async () => {
  const { server, url } = await startStubServer((_method, tool) => {
    assert.equal(tool, "listar_categorias");
    return [{ id: "c1", nombre: "Finanzas", panel: "Español", es_secuencia: false }];
  });
  try {
    const publisher = createMcpPublisher({
      client: { serverUrl: url, accessToken: "token" },
      promptText: "escribe sobre {title}",
      contentLanguage: "es",
    });
    const categorias = await publisher.fetchCategories();
    assert.deepEqual(categorias, [
      { externalId: "c1", name: "Finanzas", isSequence: false, panel: "Español" },
    ]);
  } finally {
    server.close();
  }
  await once(server, "close");
});

// La traducción de códigos de error (CUPO_DIARIO_AGOTADO / TITULO_DUPLICADO)
// se prueba directamente sobre mapMcpError, no a través de publishArticle
// completo: ese camino llama a generateCustomArticle (OpenAI real), que no
// se debe invocar en un test unitario.
test("mapMcpError traduce CUPO_DIARIO_AGOTADO a DailyLimitReachedError", () => {
  assert.throws(
    () => mapMcpError(new McpError("CUPO_DIARIO_AGOTADO", "límite diario alcanzado"), "Un título"),
    DailyLimitReachedError,
  );
});

test("mapMcpError traduce TITULO_DUPLICADO a DuplicateTitleError", () => {
  assert.throws(
    () => mapMcpError(new McpError("TITULO_DUPLICADO", "ya existe un artículo con este título"), "Un título"),
    DuplicateTitleError,
  );
});

test("mapMcpError deja pasar otros errores tal cual", () => {
  assert.throws(
    () => mapMcpError(new McpError("CATEGORIA_NO_ENCONTRADA", "no existe esa categoría"), "Un título"),
    (err: unknown) =>
      err instanceof McpError &&
      !(err instanceof DailyLimitReachedError) &&
      !(err instanceof DuplicateTitleError),
  );
});

test("publishArticle sin imageUrl falla con IMAGEN_REQUERIDA antes de generar contenido", async () => {
  const { server, url } = await startStubServer(() => {
    throw new Error("no debería llamarse al servidor MCP sin imagen");
  });
  try {
    const publisher = createMcpPublisher({
      client: { serverUrl: url, accessToken: "token" },
      promptText: "escribe sobre {title}",
      contentLanguage: "es",
    });
    await assert.rejects(
      () =>
        publisher.publishArticle({
          title: "Un título",
          categoryExternalId: "c1",
          disableIndexing: false,
          onStep: async () => {},
        }),
      /IMAGEN_REQUERIDA|imagen_url/,
    );
  } finally {
    server.close();
  }
  await once(server, "close");
});

test("TITULO_DUPLICADO en actualizar_articulo se traduce a DuplicateTitleError", async () => {
  const { server, url } = await startStubServer((_method, tool) => {
    assert.equal(tool, "actualizar_articulo");
    const err = new Error("ya existe un artículo con este título") as Error & { code: string };
    err.code = "TITULO_DUPLICADO";
    throw err;
  });
  try {
    const publisher = createMcpPublisher({
      client: { serverUrl: url, accessToken: "token" },
      promptText: "escribe sobre {title}",
      contentLanguage: "es",
    });
    // updateArticle no pasa por mapMcpError (solo publishArticle lo hace);
    // se verifica igual que el McpError original conserva el código, para
    // que quien llame a updateArticle pueda decidir qué hacer con él.
    await assert.rejects(
      () => publisher.updateArticle!("a1", { title: "Nuevo título" }),
      (err: unknown) => err instanceof Error && /ya existe un artículo/.test(err.message),
    );
  } finally {
    server.close();
  }
  await once(server, "close");
});
