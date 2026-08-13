import { execFileSync } from "node:child_process";
import { prisma } from "@auto-articulos/db";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.PRODUCT_UPDATE_MODEL ?? "gpt-5-mini";
const MAX_DIFF_CHARS = 30_000;

type GeneratedUpdate = {
  shouldPublish: boolean;
  category: "nuevas-herramientas" | "arreglos" | null;
  title: string | null;
  summary: string | null;
  example: string | null;
  modulePath: string | null;
};

function git(...args: string[]) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function valid(update: GeneratedUpdate): update is GeneratedUpdate & {
  category: "nuevas-herramientas" | "arreglos";
  title: string;
  summary: string;
  example: string;
  modulePath: string | null;
} {
  return update.shouldPublish &&
    (update.category === "nuevas-herramientas" || update.category === "arreglos") &&
    typeof update.title === "string" && update.title.trim().length > 0 &&
    typeof update.summary === "string" && update.summary.trim().length > 0 &&
    typeof update.example === "string" && update.example.trim().length > 0 &&
    (update.modulePath === null || (typeof update.modulePath === "string" && update.modulePath.startsWith("/dashboard/")));
}

async function generate(commit: string, subject: string, diff: string): Promise<GeneratedUpdate> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no está configurada.");

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "product_update",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["shouldPublish", "category", "title", "summary", "example", "modulePath"],
            properties: {
              shouldPublish: { type: "boolean" },
              category: { type: ["string", "null"], enum: ["nuevas-herramientas", "arreglos", null] },
              title: { type: ["string", "null"] },
              summary: { type: ["string", "null"] },
              example: { type: ["string", "null"] },
              modulePath: { type: ["string", "null"] },
            },
          },
        },
      },
      messages: [
        {
          role: "system",
          content: "Eres el editor del registro de actualizaciones de una plataforma de creación de artículos. Decide si un cambio es visible o útil para usuarios finales. Nunca describas infraestructura, secretos, tests, dependencias, agentes, commits ni detalles internos. Si no cambia cómo una persona usa o experimenta la plataforma, devuelve shouldPublish=false y los demás campos null. Si sí aplica, escribe un título corto y una explicación en español claro para cualquier persona, sin tecnicismos, con un ejemplo concreto. No inventes funciones. modulePath debe ser la ruta interna exacta del módulo afectado, empezando por /dashboard/; si el diff no permite saberla con seguridad, usa null. Nunca devuelvas URL externa.",
        },
        {
          role: "user",
          content: `Commit ${commit}\nAsunto: ${subject}\n\nDiff (puede estar truncado):\n${diff.slice(0, MAX_DIFF_CHARS)}`,
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`OpenAI respondió ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI no devolvió contenido.");
  return JSON.parse(content) as GeneratedUpdate;
}

async function main() {
  const commit = process.argv[2] ?? git("rev-parse", "HEAD");
  const existing = await prisma.productUpdate.findUnique({ where: { sourceCommit: commit } });
  if (existing) return console.log(`[actualizaciones] ${commit}: ya registrado.`);

  const subject = git("show", "-s", "--format=%s", commit);
  const diff = git("show", "--format=", "--no-ext-diff", commit);
  const update = await generate(commit, subject, diff);
  if (!valid(update)) return console.log(`[actualizaciones] ${commit}: sin cambio visible para usuarios.`);

  await prisma.productUpdate.create({
    data: {
      date: new Date(), sourceCommit: commit, category: update.category,
      title: update.title.trim(), summary: update.summary.trim(), example: update.example.trim(),
      modulePath: update.modulePath,
    },
  });
  console.log(`[actualizaciones] ${commit}: entrada creada.`);
}

main().catch((error) => {
  console.error("[actualizaciones] No se pudo registrar el cambio:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
