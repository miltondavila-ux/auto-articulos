import "dotenv/config";
import { prisma } from "@auto-articulos/db";
import { processNext } from "./queue";
import { processNextCategorySync } from "./categorySync";
import { processNextLanguageSync } from "./languageSync";
import { processNextBusinessProfilePost } from "./businessProfilePublish";
import { processNextSocialPublish } from "./socialPublish";

// Worker de PRUEBAS (20/8/2026), pedido explícito de Milton: mientras
// programa, probar en producción con la cuenta de pruebas
// (segurosdesaludyvida.com / Lorena Álvarez) lo hacía esperar hasta 40
// minutos por corrida, porque compartía cola y concurrency.group con el
// worker real — un shard que agarraba trabajo de OTRO usuario real se
// quedaba ocupado hasta 15 minutos, y el siguiente disparo (de prueba o
// real) esperaba detrás en la cola. Ver COORDINACION_CLAUDE_CODEX.md.
//
// Este script SOLO procesa trabajo del usuario indicado en
// WORKER_TEST_USER_EMAIL — nunca toca la cola de un cliente real. Se
// dispara a mano (workflow_dispatch en worker-test.yml), con su propio
// concurrency group, así nunca espera detrás del worker principal.
const BUDGET_MS = 8 * 60 * 1000;
const IDLE_DELAY_MS = 3_000;
const IDLE_EXIT_MS = 20 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runLane(
  laneName: string,
  processOne: () => Promise<boolean>,
  deadline: number,
): Promise<boolean> {
  let didWork = false;
  let idleSince = Date.now();
  while (Date.now() < deadline) {
    try {
      const startedAt = Date.now();
      console.log(`[TEST] Lane "${laneName}": inicia unidad de trabajo.`);
      const did = await processOne();
      console.log(
        `[TEST] Lane "${laneName}": unidad terminó en ${Date.now() - startedAt}ms (trabajo=${did}).`,
      );
      if (did) {
        didWork = true;
        idleSince = Date.now();
        continue;
      }
    } catch (err) {
      console.error(`[TEST] Lane "${laneName}" falló en esta vuelta:`, err);
    }
    if (Date.now() - idleSince >= IDLE_EXIT_MS) break;
    await sleep(IDLE_DELAY_MS);
  }
  return didWork;
}

async function main() {
  const email = process.env.WORKER_TEST_USER_EMAIL?.trim();
  if (!email) {
    throw new Error(
      "WORKER_TEST_USER_EMAIL no está configurada. Este worker de pruebas nunca corre sin un usuario específico (para no tocar la cola de un cliente real).",
    );
  }
  const articleUrl = process.env.WORKER_TEST_ARTICLE_URL?.trim() || undefined;

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) {
    throw new Error(`No existe ningún usuario con el correo "${email}".`);
  }

  console.log(`[TEST] Procesando SOLO el trabajo pendiente de: ${user.email} (${user.id})${articleUrl ? ` y del artículo ${articleUrl}` : ""}`);

  const deadline = Date.now() + BUDGET_MS;

  const results = await Promise.all([
    runLane("categorías", () => processNextCategorySync(user.id), deadline),
    runLane("idiomas", () => processNextLanguageSync(user.id), deadline),
    runLane("perfil de negocio", () => processNextBusinessProfilePost(user.id), deadline),
    runLane("títulos", () => processNext(user.id), deadline),
    runLane("redes sociales", () => processNextSocialPublish(user.id, articleUrl), deadline),
  ]);
  const didAnyWork = results.some(Boolean);

  console.log(
    didAnyWork
      ? `[TEST] Trabajo de ${user.email} procesado.`
      : `[TEST] ${user.email} no tenía nada pendiente.`,
  );
}

main()
  .catch((err) => {
    console.error("Error inesperado en run-test-once:", err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
