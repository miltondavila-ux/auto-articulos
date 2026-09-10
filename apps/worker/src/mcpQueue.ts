// Segunda línea de ejecución de publicación: cola de trabajo para cuentas
// conectadas por MCP (2026-09-07/08, "MCP 10MWS").
//
// Separado de `queue.ts` a propósito: ese archivo ya es sensible (es el que
// corre en producción para TODAS las cuentas hoy, todas en BROWSER) y el
// Protocolo de No Destrucción pide cambios mínimos sobre lo que ya
// funciona. Esta cola nueva no se ejecuta para ninguna cuenta existente —
// solo se llega acá cuando `User.publishMethod === "MCP"`, algo que hoy no
// activa ninguna interfaz visible todavía (ver plan, sección "Qué NO se
// hace en esta fase").
//
// Pendiente antes de poder usarse contra un servidor MCP real:
// 1. URL real del servidor MCP de 10MWS (no existe todavía).
// 2. Refresh automático del access token (hoy usa el que haya, sin refrescar).
// 3. El paso de "generar y alojar imagen" del lado de SEO Total (ver
//    publisher.ts, campo `imageUrl` de PublishArticleInput) — no existe
//    todavía un generador de imágenes para el flujo MCP.

import { prisma, Prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";
import { createMcpPublisher } from "./automation/mcpPublisher";
import { markTitleError, restoreUnfinishedTitlesToOpportunities } from "./queue";

type RunForMcp = Prisma.RunGetPayload<{
  include: {
    category: true;
    prompt: true;
    user: {
      select: {
        platformDomain: true;
        contentLanguage: true;
        articleSignature: true;
        phone: true;
        country: true;
        name: true;
        firstName: true;
        lastName: true;
        publishMethod: true;
      };
    };
  };
}>;

type TitleForMcp = NonNullable<Awaited<ReturnType<typeof prisma.title.findFirst>>>;

/** URL del servidor MCP por proveedor. Sin valor real todavía para "10mws"
 * (ver cabecera del archivo) — se resuelve por variable de entorno para no
 * clavar ningún dominio de prueba en el código. */
function resolveMcpServerUrl(provider: string): string {
  const envKey = `MCP_SERVER_URL_${provider.toUpperCase()}`;
  const url = process.env[envKey];
  if (!url) {
    throw new Error(
      `No hay URL configurada para el servidor MCP del proveedor "${provider}" (variable ${envKey}).`,
    );
  }
  return url;
}

export async function processMcpRunTitle(
  run: RunForMcp,
  nextTitle: TitleForMcp,
): Promise<boolean> {
  const provider = "10mws";
  const connection = await prisma.mcpConnection.findUnique({
    where: { userId_provider: { userId: run.userId, provider } },
  });

  if (!connection || connection.revokedAt) {
    await markTitleError(
      nextTitle.id,
      "La cuenta está configurada para publicar por MCP pero no tiene una conexión activa. Conectala de nuevo desde Configuración.",
    );
    await prisma.run.updateMany({
      where: { id: run.id, status: { in: ["pending", "running"] } },
      data: { status: "halted", finishedAt: new Date() },
    });
    await restoreUnfinishedTitlesToOpportunities(run.id);
    return true;
  }

  const promptText = run.prompt?.prompt || null;
  if (!promptText) {
    // A diferencia del flujo por navegador, acá no existe un "estándar" al
    // que caer: el servidor MCP no genera contenido (ver
    // MCP_DE_ARTICULOS_ESPECIFICACION.md, sección 1). Sin prompt propio no
    // hay forma de redactar el artículo.
    await markTitleError(
      nextTitle.id,
      "Esta cuenta publica por MCP y no tiene un prompt de redacción configurado (ni en el lote ni como prompt por defecto). Configurá uno en Configuración antes de reintentar.",
    );
    await prisma.run.updateMany({
      where: { id: run.id, status: { in: ["pending", "running"] } },
      data: { status: "halted", finishedAt: new Date() },
    });
    await restoreUnfinishedTitlesToOpportunities(run.id);
    return true;
  }

  const effectiveLanguage =
    (run.contentLanguage && run.contentLanguage.trim()) ||
    (run.user.contentLanguage && run.user.contentLanguage.trim());
  if (!effectiveLanguage) {
    await markTitleError(
      nextTitle.id,
      "No se encontró un idioma de redacción configurado para este lote ni en el perfil del usuario. Configúralo en Configuración antes de reintentar.",
    );
    await prisma.run.updateMany({
      where: { id: run.id, status: { in: ["pending", "running"] } },
      data: { status: "halted", finishedAt: new Date() },
    });
    await restoreUnfinishedTitlesToOpportunities(run.id);
    return true;
  }

  const claimed = await prisma.title.updateMany({
    where: { id: nextTitle.id, status: "pending" },
    data: { status: "processing", attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return false;

  const onStep = async (message: string) => {
    await prisma.titleEvent.create({ data: { titleId: nextTitle.id, message } });
  };

  const publisher = createMcpPublisher({
    client: {
      serverUrl: resolveMcpServerUrl(provider),
      accessToken: decryptSecret(connection.accessTokenEncrypted),
    },
    promptText,
    contentLanguage: effectiveLanguage,
    authorName:
      [run.user.firstName, run.user.lastName].filter(Boolean).join(" ") || run.user.name || null,
    panel: run.category.panel || null,
  });

  try {
    const result = await publisher.publishArticle({
      title: nextTitle.text,
      categoryExternalId: run.category.externalId,
      disableIndexing: run.disableIndexing,
      categoryPanel: run.category.panel || "",
      onStep,
      // Todavía no existe el paso de "generar y alojar imagen" del lado de
      // SEO Total para este flujo (ver cabecera del archivo) — se deja sin
      // valor a propósito, y el publisher falla con un error identificable
      // (IMAGEN_REQUERIDA) en vez de publicar sin imagen.
      imageUrl: undefined,
    });

    await prisma.title.update({
      where: { id: nextTitle.id },
      data: {
        status: "success",
        articleUrl: result.articleUrl,
        finalTitle: result.finalTitle,
        summary: result.summary,
        publishedAt: new Date(),
        processedAt: new Date(),
        errorMessage: null,
      },
    });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markTitleError(nextTitle.id, message);
    return true;
  }
}
