import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  getBingAccessToken,
  submitBingUrl,
} from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";

/**
 * MASTER INDEXACION BING — envía TODOS los artículos publicados del usuario a Bing
 * para indexación instantánea de un solo golpe.
 */
export async function POST() {
  try {
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

    // Buscar TODOS los artículos publicados del usuario (con URL de artículo)
    const allTitles = await prisma.title.findMany({
      where: {
        run: { userId },
        articleUrl: { not: null },
      },
      select: { id: true, articleUrl: true, text: true, bingIndexingStatus: true },
      orderBy: { processedAt: "asc" },
    });

    // Filtrar los que tienen una URL válida no vacía
    const titles = allTitles.filter(
      (t) => t.articleUrl && t.articleUrl.trim().length > 0,
    );

    if (titles.length === 0) {
      return NextResponse.json({
        ok: true,
        total: 0,
        enviados: 0,
        errores: 0,
        message: "No hay artículos publicados con URL para enviar.",
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
              : "No se pudo obtener el acceso con Bing Webmaster Tools.",
        },
        { status: 501 },
      );
    }

    let enviados = 0;
    let errores = 0;
    const erroresDetalle: string[] = [];

    // Procesar en lotes de 10 asegurando que cada uno incremente la cuenta
    const BATCH_SIZE = 10;
    for (let i = 0; i < titles.length; i += BATCH_SIZE) {
      const batch = titles.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (title) => {
          const urlToSend = title.articleUrl!.trim();
          try {
            await submitBingUrl(accessToken, integration.siteUrl!, urlToSend);

            try {
              await prisma.title.update({
                where: { id: title.id },
                data: {
                  bingIndexingStatus: "submitted",
                  bingIndexingMessage: "Enviado a Bing por MASTER INDEXACION.",
                  bingIndexingAt: new Date(),
                },
              });
            } catch {}

            enviados++;
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);

            try {
              await prisma.title.update({
                where: { id: title.id },
                data: {
                  bingIndexingStatus: "error",
                  bingIndexingMessage: msg,
                  bingIndexingAt: new Date(),
                },
              });
            } catch {}

            errores++;
            if (erroresDetalle.length < 5) {
              erroresDetalle.push(`${title.text}: ${msg}`);
            }
          }
        }),
      );
    }

    return NextResponse.json({
      ok: true,
      total: titles.length,
      enviados,
      errores,
      erroresDetalle: erroresDetalle.length > 0 ? erroresDetalle : undefined,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
