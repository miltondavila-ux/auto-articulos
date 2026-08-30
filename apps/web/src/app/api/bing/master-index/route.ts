import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getBingUrlQuota, submitBingUrl } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getBingTokenForIntegration } from "@/lib/bing-token";

/**
 * MASTER INDEXACION BING — envía a Bing los artículos publicados del usuario
 * que todavía no se enviaron, para indexación instantánea.
 *
 * Reescrito el 13/8/2026. Antes mandaba TODOS los artículos publicados cada
 * vez que se pulsaba el botón, incluidos los ya enviados, de 10 en 10 en
 * paralelo y sin mirar el cupo. Eso está mal por tres motivos comprobados
 * contra la documentación de Microsoft:
 *
 *  1. El cupo de envío de URLs es chico y por sitio — el ejemplo oficial de
 *     GetUrlSubmissionQuota devuelve 5 diarias y 24 mensuales. Mandar 40
 *     artículos de una no envía 40: envía unos pocos y el resto rebota.
 *  2. Reenviar lo ya enviado gasta ese cupo escaso en artículos que Bing ya
 *     conoce, desplazando a los nuevos, que son los que importan.
 *  3. El comentario de apps/worker/src/bingIndexing.ts:14 dejó registrado que
 *     el "InvalidToken" aparecía de forma INTERMITENTE dentro de un mismo
 *     lote — unos títulos sí y otros no, con el mismo token. Eso no es un
 *     token inválido, es cupo agotado o throttling que Bing reporta con un
 *     mensaje engañoso. Por eso ahora se envía de a uno, no de 10 en paralelo.
 */
export async function POST() {
  try {
    const userId = await getCurrentUserId();

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true } });
    const integration = await prisma.searchIntegration.findFirst({ where: { userId, provider: "bing", ...(user.selectedSiteDomain ? { siteDomain: user.selectedSiteDomain } : {}) } });

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
    const conUrl = allTitles.filter(
      (t) => t.articleUrl && t.articleUrl.trim().length > 0,
    );

    if (conUrl.length === 0) {
      return NextResponse.json({
        ok: true,
        total: 0,
        enviados: 0,
        errores: 0,
        yaIndexados: 0,
        message: "No hay artículos publicados con URL para enviar.",
      });
    }

    // Los que ya se enviaron con éxito antes no se reenvían: gastarían cupo
    // en algo que Bing ya conoce. Los que quedaron en "error" sí se reintentan.
    const yaIndexados = conUrl.filter(
      (t) => t.bingIndexingStatus === "submitted",
    ).length;
    const titles = conUrl.filter((t) => t.bingIndexingStatus !== "submitted");

    if (titles.length === 0) {
      return NextResponse.json({
        ok: true,
        total: conUrl.length,
        enviados: 0,
        errores: 0,
        yaIndexados,
        message: `Tus ${yaIndexados} artículos publicados ya se enviaron a Bing. No hay nada nuevo para enviar.`,
      });
    }

    let accessToken: string;
    try {
      accessToken = await getBingTokenForIntegration(integration);
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

    // Cuánto deja mandar Bing hoy. Si la consulta falla no se aborta el envío
    // (mismo criterio defensivo que el resto de la integración): se intenta
    // igual y, si Bing rechaza por cupo, el error queda registrado por artículo.
    let cupo: { daily: number; monthly: number } | null = null;
    try {
      cupo = await getBingUrlQuota(accessToken, integration.siteUrl);
    } catch {}

    const disponible = cupo ? Math.min(cupo.daily, cupo.monthly) : titles.length;
    const aEnviar = titles.slice(0, Math.max(disponible, 0));
    const sinCupo = titles.length - aEnviar.length;

    let enviados = 0;
    let errores = 0;
    const erroresDetalle: string[] = [];

    // De a uno: el envío en paralelo era lo que producía el "InvalidToken"
    // intermitente dentro de un mismo lote.
    for (const title of aEnviar) {
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
    }

    return NextResponse.json({
      ok: true,
      total: conUrl.length,
      enviados,
      errores,
      yaIndexados,
      pendientes: titles.length,
      sinCupo,
      cupoDiario: cupo?.daily ?? null,
      cupoMensual: cupo?.monthly ?? null,
      erroresDetalle: erroresDetalle.length > 0 ? erroresDetalle : undefined,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
