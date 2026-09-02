import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { getUserManualKnowledge } from "@/lib/user-manual";

const OPENAI_URL = "https://api.openai.com/v1/responses";
const MODEL = process.env.ASSISTANT_MODEL ?? "gpt-5-mini";
const APP_URL = "https://seototal.lasolucionweb.com";

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

export async function POST(request: NextRequest) {
  try {
    await getCurrentUserId();
    const body = await request.json() as { message?: unknown };
    if (typeof body.message !== "string" || !body.message.trim() || body.message.length > 1_500) {
      return NextResponse.json({ error: "Escribe una pregunta de hasta 1.500 caracteres." }, { status: 400 });
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "El asistente no está configurado todavía." }, { status: 503 });
    const manual = await getUserManualKnowledge();
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        // GPT-5-mini usa razonamiento antes de escribir. Para preguntas de ayuda
        // cortas, el esfuerzo mínimo evita agotar el presupuesto sin respuesta.
        reasoning: { effort: "minimal" },
        max_output_tokens: 1_200,
        input: [
          {
            role: "developer",
            content: `${manual}\n\nResponde solo sobre el uso de la plataforma. Usa español sencillo y pasos concretos. Cuando el manual indique una ruta que comienza por /dashboard, incluye siempre el enlace completo y exacto usando ${APP_URL} seguido de esa ruta; por ejemplo, ${APP_URL}/dashboard/configuracion. No inventes funciones ni enlaces. Si la información no aparece en el manual, dilo claramente y sugiere contactar al administrador.`,
          },
          { role: "user", content: body.message.trim() },
        ],
      }),
    });
    if (!response.ok) {
      console.error("Assistant OpenAI request failed", {
        status: response.status,
        requestId: response.headers.get("x-request-id"),
      });
      return NextResponse.json({ error: "No pude responder ahora. Inténtalo de nuevo." }, { status: 502 });
    }
    const data = await response.json() as OpenAiResponse;
    const answer = data.output_text?.trim() ?? data.output
      ?.flatMap((item) => item.content ?? [])
      .find((content) => content.type === "output_text")
      ?.text?.trim();
    if (!answer) return NextResponse.json({ error: "No pude generar una respuesta." }, { status: 502 });
    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
}
