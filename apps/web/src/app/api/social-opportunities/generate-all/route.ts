import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { canUseSocialModule } from "@/lib/social-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!(await canUseSocialModule(userId))) {
      return NextResponse.json({ error: "Módulo reservado a administradores y Lorena." }, { status: 403 });
    }

    // Generar 1 oportunidad por cada red conectada
    const networks = ["threads", "x", "linkedin", "instagram", "facebook-page", "pinterest", "tumblr", "bluesky", "devto", "blogger"];
    const results: any = {};
    const errors: any = {};

    for (const network of networks) {
      try {
        const res = await fetch(`${new URL(request.url).origin}/api/social-opportunities/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ networks: [network] }),
        });

        const data = await res.json();
        if (res.ok) {
          results[network] = { success: true, message: data.message, count: data.count };
        } else {
          errors[network] = data.error || "Error desconocido";
        }
      } catch (err) {
        errors[network] = err instanceof Error ? err.message : String(err);
      }
    }

    const successCount = Object.values(results).filter((r: any) => r.success).length;
    const errorCount = Object.keys(errors).length;

    return NextResponse.json({
      message: `Se generaron oportunidades para ${successCount} redes. ${errorCount > 0 ? `${errorCount} redes sin conexión o error.` : ""}`,
      results,
      errors: errorCount > 0 ? errors : undefined,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Error al generar oportunidades: ${errorMessage}` }, { status: 500 });
  }
}
