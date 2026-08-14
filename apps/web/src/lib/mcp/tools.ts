import { NextRequest } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { toolText } from "./protocol";

/**
 * Las tools NO reimplementan lógica de negocio: invocan los mismos route
 * handlers que usa la interfaz web.
 *
 * Por qué esto funciona: el middleware autentica el Bearer de MCP y deja
 * `x-user-id` en los headers del request, exactamente igual que hace con la
 * cookie de sesión. Como los route handlers leen ese header vía
 * `getCurrentUserId()` -> `headers()`, y `headers()` devuelve los headers del
 * request en curso (el de /api/mcp), llamarlos directamente funciona sin
 * inventar una sesión falsa ni hacer un fetch a nosotros mismos.
 *
 * La consecuencia importante es de seguridad y de costo: los cupos
 * (`User.maxTitlesPerBatch`), el bloqueo por run en curso y la exigencia de
 * credenciales de 10minutesWebsite se aplican IGUAL por voz que por clic,
 * porque es literalmente el mismo código. Si mañana cambian esas reglas, la
 * voz las hereda sola.
 */
import { GET as listarOportunidadesRoute, POST as analizarOportunidadesRoute } from "@/app/api/opportunities/route";
import { POST as ejecutarOportunidadRoute } from "@/app/api/opportunities/execute/route";

type ToolHandler = (args: Record<string, unknown>) => Promise<ReturnType<typeof toolText>>;

type ToolDef = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  requiredScope: "oportunidades:leer" | "oportunidades:publicar";
  handler: ToolHandler;
};

/** Construye un request sintético para pasarle el body a un route handler. */
function jsonRequest(path: string, body: unknown) {
  return new NextRequest(`https://interno.local${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

/** Lee la respuesta de un route handler y normaliza el error de negocio. */
async function readRoute(response: Response) {
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: response.ok, status: response.status, data };
}

export const TOOLS: ToolDef[] = [
  {
    name: "listar_oportunidades",
    title: "Listar oportunidades",
    description:
      "Devuelve las oportunidades SEO guardadas, agrupadas por categoría, con la cantidad de títulos y las impresiones de cada una. Solo lectura: no publica ni modifica nada. Úsala antes de publicar para saber qué hay pendiente.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    requiredScope: "oportunidades:leer",
    handler: async () => {
      const { data } = await readRoute(await listarOportunidadesRoute());
      const groups = (data.groups ?? []) as Array<{
        category?: { name?: string } | null;
        impressions?: number;
        titles?: unknown[];
      }>;
      if (groups.length === 0) {
        return toolText(
          "No hay oportunidades guardadas. Puedes generarlas con la herramienta crear_oportunidades.",
        );
      }
      const lineas = groups.map((g) => {
        const nombre = g.category?.name ?? "Sin categoría";
        const cantidad = g.titles?.length ?? 0;
        return `${nombre}: ${cantidad} ${cantidad === 1 ? "título" : "títulos"}, ${g.impressions ?? 0} impresiones`;
      });
      return toolText(
        `Hay ${groups.length} ${groups.length === 1 ? "categoría" : "categorías"} con oportunidades:\n${lineas.join("\n")}`,
      );
    },
  },

  {
    name: "crear_oportunidades",
    title: "Crear oportunidades",
    description:
      "Analiza Google Search Console y genera nuevas oportunidades SEO agrupadas por categoría. No publica ningún artículo — solo propone títulos para revisar. Requiere que Google Search Console esté conectado. Se recomienda no repetir el análisis antes de 3 días; si el usuario insiste explícitamente, pasa forzar=true.",
    inputSchema: {
      type: "object",
      properties: {
        forzar: {
          type: "boolean",
          description:
            "Repetir el análisis aunque no hayan pasado los 3 días recomendados desde el último. Solo si el usuario lo pide explícitamente.",
        },
      },
      additionalProperties: false,
    },
    requiredScope: "oportunidades:publicar",
    handler: async (args) => {
      const { ok, data } = await readRoute(
        await analizarOportunidadesRoute(jsonRequest("/api/opportunities", { force: Boolean(args.forzar) })),
      );
      if (!ok) {
        return toolText(String(data.error ?? "No se pudo analizar."), true);
      }
      const groups = (data.groups ?? []) as unknown[];
      return toolText(
        `Listo. Se generaron oportunidades en ${groups.length} ${groups.length === 1 ? "categoría" : "categorías"}. No se publicó nada todavía.`,
      );
    },
  },

  {
    name: "publicar_categoria",
    title: "Publicar una categoría",
    description:
      "PUBLICA ARTÍCULOS REALES en el sitio del usuario. Acción con consecuencias visibles públicamente y que consume créditos de generación. Llama SIEMPRE primero con confirmar=false: eso no publica nada, solo devuelve qué títulos se publicarían para que el usuario los escuche y decida. Solo vuelve a llamar con confirmar=true después de que el usuario haya dicho que sí de forma explícita.",
    inputSchema: {
      type: "object",
      properties: {
        categoria: {
          type: "string",
          description: "Nombre de la categoría a publicar, tal como se lo dijo el usuario.",
        },
        confirmar: {
          type: "boolean",
          description:
            "false (por defecto) = solo previsualizar los títulos, no publica. true = publicar de verdad, únicamente tras confirmación explícita del usuario.",
        },
      },
      required: ["categoria"],
      additionalProperties: false,
    },
    requiredScope: "oportunidades:publicar",
    handler: async (args) => {
      const categoria = String(args.categoria ?? "").trim();
      if (!categoria) return toolText("Falta el nombre de la categoría.", true);

      const userId = await getCurrentUserId();
      // Búsqueda tolerante: la voz llega sin acentos consistentes ni
      // mayúsculas, y el usuario dice el nombre aproximado, no el exacto.
      const grupos = await prisma.opportunityGroup.findMany({
        where: { userId, category: { name: { contains: categoria, mode: "insensitive" } } },
        include: { category: true, titles: { orderBy: { createdAt: "asc" } } },
      });

      if (grupos.length === 0) {
        return toolText(
          `No encontré ninguna categoría con oportunidades que se parezca a "${categoria}". Usa listar_oportunidades para ver las disponibles.`,
          true,
        );
      }
      if (grupos.length > 1) {
        const nombres = grupos.map((g) => g.category?.name ?? "sin nombre").join(", ");
        return toolText(
          `"${categoria}" coincide con varias categorías: ${nombres}. Pregúntale al usuario cuál de ellas quiere publicar.`,
          true,
        );
      }

      const grupo = grupos[0];
      const nombre = grupo.category?.name ?? "sin nombre";
      const titulos = grupo.titles.map((t) => t.text);

      if (titulos.length === 0) {
        return toolText(`La categoría "${nombre}" no tiene títulos para publicar.`, true);
      }

      // Puerta de confirmación. Es la única salvaguarda propia de la voz: por
      // clic el usuario ve la lista en pantalla antes de ejecutar, y acá no
      // ve nada, así que se la leemos primero.
      if (args.confirmar !== true) {
        return toolText(
          `Sin publicar todavía. La categoría "${nombre}" tiene ${titulos.length} ${titulos.length === 1 ? "título" : "títulos"}:\n${titulos.map((t) => `- ${t}`).join("\n")}\n\nLéele estos títulos al usuario y pregúntale si confirma la publicación. Si dice que sí, vuelve a llamar a esta herramienta con confirmar=true.`,
        );
      }

      const { ok, data } = await readRoute(
        await ejecutarOportunidadRoute(
          jsonRequest("/api/opportunities/execute", { type: "group", id: grupo.id }),
        ),
      );
      if (!ok) {
        // El route handler ya devuelve mensajes en español pensados para el
        // usuario final (cupo excedido, run en curso, falta credencial); se
        // pasan tal cual para que Alexa los lea sin reinterpretarlos.
        return toolText(String(data.error ?? "No se pudo publicar."), true);
      }
      return toolText(
        `Publicación iniciada para "${nombre}" con ${titulos.length} ${titulos.length === 1 ? "título" : "títulos"}. Los artículos se están generando; puedes consultar el avance con estado_de_publicaciones.`,
      );
    },
  },

  {
    name: "estado_de_publicaciones",
    title: "Estado de las publicaciones",
    description:
      "Informa si hay una publicación en curso y cómo salieron las últimas. Solo lectura.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    requiredScope: "oportunidades:leer",
    handler: async () => {
      const userId = await getCurrentUserId();
      const runs = await prisma.run.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { category: true, titles: true },
      });
      if (runs.length === 0) return toolText("Todavía no hay publicaciones registradas.");

      const enCurso = runs.filter((r) => r.status === "pending" || r.status === "running");
      const lineas = runs.map((r) => {
        const nombre = r.category?.name ?? "sin categoría";
        return `${nombre}: ${r.status}, ${r.titles.length} ${r.titles.length === 1 ? "título" : "títulos"}`;
      });
      const cabecera =
        enCurso.length > 0
          ? `Hay ${enCurso.length} ${enCurso.length === 1 ? "publicación" : "publicaciones"} en curso.`
          : "No hay ninguna publicación en curso.";
      return toolText(`${cabecera}\nÚltimas ejecuciones:\n${lineas.join("\n")}`);
    },
  },
];

export function findTool(name: string, scopes: string[]) {
  return TOOLS.find((tool) => tool.name === name && scopes.includes(tool.requiredScope));
}

/** Forma que espera `tools/list` (sin el handler, que es interno). */
export function listToolsPayload(scopes: string[]) {
  return TOOLS.filter((tool) => scopes.includes(tool.requiredScope)).map(({ name, title, description, inputSchema }) => ({
    name,
    title,
    description,
    inputSchema,
  }));
}
