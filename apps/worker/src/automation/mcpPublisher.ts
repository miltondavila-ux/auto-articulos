// Segunda línea de ejecución de publicación: MCP (2026-09-07/08, "MCP
// 10MWS"). Implementa `ArticlePublisher` llamando al servidor MCP remoto de
// la plataforma destino en vez de manejar un navegador.
//
// Sin URL real todavía contra la que probar (el equipo de 10MWS no la
// entregó — ver MCP_DE_ARTICULOS_ESPECIFICACION.md, sección 13). Este
// módulo queda listo para conectarse en cuanto exista; mientras tanto se
// valida con un servidor MCP de prueba en los tests.
//
// Decisión explícita de Milton (2026-09-08): el recorte/optimización de la
// imagen NO lo hace la plataforma receptora — lo hace SEO Total antes de
// llamar a `crear_articulo`. El servidor MCP remoto recibe una `imagen_url`
// ya lista y solo hace "copy and paste" de todo el proceso (la descarga y
// la guarda, sin reprocesarla). Por eso `prepareImageUrl()` existe de este
// lado: hoy es un paso identidad porque no conocemos todavía las reglas
// reales de `requisitos_de_publicacion` de ningún proveedor; el día que haya
// un servidor real, este es el punto donde se aplica el recorte/optimizado
// según esas reglas antes de mandar la URL final.
//
// Las cuentas conectadas por MCP no tienen acceso al "generador con IA"
// propio del sitio destino (el contrato dice explícitamente que el artículo
// ya viene hecho) — por eso este publisher SIEMPRE genera el contenido con
// `generateCustomArticle()`, nunca con el flujo "estándar".

import { callMcpTool, McpError, type McpClientConfig } from "@auto-articulos/shared";
import { generateCustomArticle } from "./generateCustomArticle";
import { DailyLimitReachedError, DuplicateTitleError } from "./10minutesWebsite";
import type {
  AccountStatus,
  ArticlePublisher,
  PublishArticleInput,
  PublishResult,
  RemoteCategory,
  RemoteLanguage,
  RemotePanel,
  UpdateArticleInput,
} from "./publisher";

export interface McpPublisherContext {
  client: McpClientConfig;
  /** Prompt de redacción a usar (Run.promptId ?? User.defaultPromptId ??
   * un prompt por defecto de la cuenta MCP — a definir con Milton cuál se
   * usa si la cuenta no configuró ninguno propio). Nunca null en este
   * publisher: no existe un flujo "estándar" del lado MCP. */
  promptText: string;
  contentLanguage: string;
  authorName?: string | null;
  /** Panel elegido por la cuenta, si el proveedor remoto los usa. */
  panel?: string | null;
}

interface RequisitosDePublicacion {
  titulo_max_caracteres?: number;
  resumen_max_caracteres?: number;
  imagen?: {
    formatos?: string[];
    peso_max_bytes?: number;
    ancho_min?: number;
    alto_min?: number;
    relacion_aspecto?: string;
  };
  html_permitido?: string[];
  widget_acepta_html_literal?: boolean;
  limites?: { peticiones_por_minuto?: number; concurrencia_maxima?: number };
}

interface CrearArticuloResultado {
  id: string;
  url: string | null;
}

/**
 * Punto único donde se aplicará el recorte/optimización de imagen que hace
 * SEO Total (ver nota de cabecera). Hoy es identidad: no hay reglas reales
 * de ningún proveedor todavía, e inventar dimensiones sería peor que no
 * tocar la imagen.
 */
function prepareImageUrl(imageUrl: string, _requisitos: RequisitosDePublicacion | null): string {
  return imageUrl;
}

/** Exportado para poder probarse sin depender de una llamada real a OpenAI
 * (generateCustomArticle) ni a un servidor MCP real. */
export function mapMcpError(err: unknown, title: string): never {
  if (err instanceof McpError) {
    if (err.code === "CUPO_DIARIO_AGOTADO") {
      throw new DailyLimitReachedError(err.message);
    }
    if (err.code === "TITULO_DUPLICADO") {
      throw new DuplicateTitleError(err.message, []);
    }
  }
  throw err instanceof Error ? err : new Error(`Error MCP publicando "${title}": ${String(err)}`);
}

export function createMcpPublisher(ctx: McpPublisherContext): ArticlePublisher {
  async function fetchRequisitos(): Promise<RequisitosDePublicacion | null> {
    try {
      return await callMcpTool<RequisitosDePublicacion>(ctx.client, "requisitos_de_publicacion", {});
    } catch {
      // No bloquea la publicación: si el proveedor no puede informar sus
      // reglas en este momento, se sigue con el paso de imagen en modo
      // identidad (ver prepareImageUrl) en vez de fallar todo el lote.
      return null;
    }
  }

  return {
    async fetchCategories(): Promise<RemoteCategory[]> {
      const categorias = await callMcpTool<
        { id: string; nombre: string; panel: string; es_secuencia: boolean }[]
      >(ctx.client, "listar_categorias", ctx.panel ? { panel: ctx.panel } : {});
      return categorias.map((c) => ({
        externalId: c.id,
        name: c.nombre,
        isSequence: c.es_secuencia,
        panel: c.panel ?? "",
      }));
    },

    async fetchLanguages(): Promise<RemoteLanguage[]> {
      // El contrato de 10MWS no ofrece `listar_idiomas`: el idioma es un
      // campo del artículo (`idioma`), no algo que se liste desde la cuenta
      // remota (ver MCP_DE_ARTICULOS_ESPECIFICACION.md, sección 6.9).
      return [];
    },

    async listPanels(): Promise<RemotePanel[]> {
      const paneles = await callMcpTool<{ id: string; nombre: string }[]>(
        ctx.client,
        "listar_paneles",
        {},
      );
      return paneles.map((p) => ({ id: p.id, name: p.nombre }));
    },

    async publishArticle(input: PublishArticleInput): Promise<PublishResult> {
      if (!input.imageUrl) {
        // Ver el comentario de `imageUrl` en publisher.ts: falta decidir y
        // construir el paso de "generar y alojar imagen" del lado de SEO
        // Total para el flujo MCP. No se inventa una imagen ni se publica
        // sin ella — el contrato la exige siempre. Se valida ANTES de
        // gastar una llamada de generación de contenido con IA.
        throw new McpError(
          "IMAGEN_REQUERIDA",
          `No hay imagen generada por SEO Total para "${input.title}"; el flujo MCP no puede publicar sin \`imagen_url\`.`,
        );
      }

      await input.onStep(`Generando contenido con el prompt de la cuenta para "${input.title}".`);
      const generated = await generateCustomArticle(
        input.title,
        ctx.promptText,
        ctx.contentLanguage,
        ctx.authorName,
      );

      const requisitos = await fetchRequisitos();
      const imagenUrl = prepareImageUrl(input.imageUrl, requisitos);

      try {
        const resultado = await callMcpTool<CrearArticuloResultado>(ctx.client, "crear_articulo", {
          panel: ctx.panel || undefined,
          categoria_id: input.categoryExternalId,
          idioma: ctx.contentLanguage,
          titulo: generated.title,
          resumen: generated.summary,
          contenido_html: generated.contentHtml,
          imagen_url: imagenUrl,
          indexar: !input.disableIndexing,
          clave_idempotencia: `${input.categoryExternalId}:${input.title}`,
        });
        await input.onStep(`Artículo publicado por MCP: ${resultado.url ?? resultado.id}.`);
        return {
          articleUrl: resultado.url,
          finalTitle: generated.title,
          summary: generated.summary,
        };
      } catch (err) {
        return mapMcpError(err, input.title);
      }
    },

    async updateArticle(externalId: string, input: UpdateArticleInput): Promise<PublishResult> {
      const resultado = await callMcpTool<CrearArticuloResultado>(ctx.client, "actualizar_articulo", {
        id: externalId,
        titulo: input.title,
        categoria_id: input.categoryExternalId,
        indexar: input.disableIndexing === undefined ? undefined : !input.disableIndexing,
      });
      return { articleUrl: resultado.url, finalTitle: input.title ?? "", summary: "" };
    },

    async deleteArticle(externalId: string, confirmTitle: string): Promise<void> {
      await callMcpTool(ctx.client, "borrar_articulo", { id: externalId, confirmar_titulo: confirmTitle });
    },

    async getAccountStatus(): Promise<AccountStatus> {
      const estado = await callMcpTool<{
        activa: boolean;
        limite_diario?: number;
        articulos_publicados_hoy?: number;
        cupo_restante?: number;
        creditos_imagen?: number;
        // Nombre exacto de este campo a confirmar contra el contrato final
        // de 10MWS cuando exista un servidor real.
        reinicio_cupo?: string;
      }>(ctx.client, "estado_cuenta", {});
      return {
        active: estado.activa,
        dailyLimit: estado.limite_diario,
        publishedToday: estado.articulos_publicados_hoy,
        remainingQuota: estado.cupo_restante,
        imageCredits: estado.creditos_imagen,
        quotaResetsAt: estado.reinicio_cupo ?? null,
      };
    },
  };
}

export { prepareImageUrl };
