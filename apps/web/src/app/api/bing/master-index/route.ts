import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getBingAccessToken,
  submitBingUrl,
} from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";

const BATCH_SIZE = 50;
const DELAY_MS = 200;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * MASTER INDEXACION BING — envía TODOS los artículos publicados del usuario
 * que aún no fueron enviados a Bing para indexación instantánea. Respetando
 * el límite de 10,000 URLs/día de Bing, procesa en lotes de 50 con pausa
 * entre cada lote.
 */
export async function POST() {
  const userId = await getCurrentUserId();

  const integration = await prisma.searchIntegration.findUnique({
    where: { userId_provider: { userId, provider: "bing" } },
  });

  if (!integration?.siteUrl) {
    return NextResponse.json(
      {
        error:
          "Conecta Bing Webmaster Tools y selecciona tu sitio verificado primero.",
      },
      { status: 400 },
    );
  }

  const titles = await prisma.title.findMany({
    where: {
      run: { userId },
      articleUrl: { not: null },
      OR: [
        { bingIndexingStatus: null },
        { bingIndexingStatus: "not_configured" },
        { bingIndexingStatus: "error" },
      ],
    },
    select: { id: true, articleUrl: true, text: true },
    orderBy: { processedAt: "asc" },
  });

  // Contar artículos que YA fueron enviados anteriormente
  const yaIndexados = await prisma.title.count({
    where: {
      run: { userId },
      articleUrl: { not: null },
      bingIndexingStatus: "submitted",
    },
  });

  const ultimoEnvio = await prisma.title.findFirst({
    where: {
      run: { userId },
      articleUrl: { not: null },
      bingIndexingStatus: "submitted",
      bingIndexingAt: { not: null },
    },
    orderBy: { bingIndexingAt: "desc" },
    select: { bingIndexingAt: true },
  });

  if (titles.length === 0) {
    return NextResponse.json({
      ok: true,
      total: 0,
      enviados: 0,
      errores: 0,
      yaIndexados,
      ultimoEnvio: ultimoEnvio?.bingIndexingAt ?? null,
      message:
        yaIndexados > 0
          ? `Todos tus artículos ya fueron enviados a Bing (${yaIndexados} indexados).`
          : "No hay artículos publicados.",
    });
  }

  let accessToken: string;
  try {
    accessToken = await getBingAccessToken(
      decryptSecret(integration.encryptedRefreshToken),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo obtener el token de Bing.",
      },
      { status: 501 },
    );
  }

  let enviados = 0;
  let errores = 0;
  const erroresDetalle: string[] = [];

  for (let i = 0; i < titles.length; i += BATCH_SIZE) {
    const batch = titles.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (title) => {
        try {
          await submitBingUrl(accessToken, integration.siteUrl!, title.articleUrl!);
          await prisma.title.update({
            where: { id: title.id },
            data: {
              bingIndexingStatus: "submitted",
              bingIndexingMessage:
                "Enviado a Bing por MASTER INDEXACION.",
              bingIndexingAt: new Date(),
            },
          });
          enviados++;
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : String(error);
          await prisma.title.update({
            where: { id: title.id },
            data: {
              bingIndexingStatus: "error",
              bingIndexingMessage: msg,
              bingIndexingAt: new Date(),
            },
          });
          errores++;
          if (erroresDetalle.length < 5) {
            erroresDetalle.push(`${title.text}: ${msg}`);
          }
        }
      }),
    );

    if (i + BATCH_SIZE < titles.length) {
      await sleep(DELAY_MS);
    }
  }

  return NextResponse.json({
    ok: true,
    total: titles.length,
    enviados,
    errores,
    yaIndexados,
    ultimoEnvio: ultimoEnvio?.bingIndexingAt ?? null,
    erroresDetalle: erroresDetalle.length > 0 ? erroresDetalle : undefined,
  });
}
