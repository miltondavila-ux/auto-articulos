import "dotenv/config";
import { processNext } from "./queue";
import { processNextCategorySync } from "./categorySync";
import { cleanupOldEvents, recoverStuckTitles } from "./cleanup";

// Pensado para correr en un runner efímero (GitHub Actions), no como proceso
// 24/7 como index.ts. Procesa todo el trabajo pendiente hasta que no quede
// nada, o hasta agotar el presupuesto de tiempo (para no exceder el límite
// del job y dejar que la siguiente corrida programada continúe).
const BUDGET_MS = 18 * 60 * 1000;

// Cuántos usuarios distintos se procesan en paralelo (cada uno con su propia
// sesión de 10minutesWebsite, nunca dos lanes en la misma cuenta a la vez —
// ver reservation.ts). Pedido explícito del usuario (31/7/2026): que el
// trabajo de un usuario no quede esperando a que termine el de otro.
// Valor conservador a propósito DENTRO de un mismo shard: el runner estándar
// de GitHub Actions tiene solo 2 vCPU, y cada lane abre su propio navegador
// Playwright. La escala real para ~40 usuarios activos viene de correr
// varios shards en paralelo (ver worker.yml, `strategy.matrix`), cada uno
// con su propio runner y estas mismas lanes — no de subir este número.
const TITLE_LANE_CONCURRENCY = 2;

// Sincronizar categorías es mucho más rápido que publicar un artículo (solo
// lee un <select>, no genera contenido/imagen con IA), así que puede tener
// más carriles sin pesar tanto en el runner. Pedido explícito del usuario:
// que sincronizar categorías no haga esperar tanto.
const SYNC_LANE_CONCURRENCY = 2;

// Ronda vacía consecutiva en un lane antes de darlo por sin trabajo por
// ahora (evita que un lane se detenga apenas por perder una carrera de
// reserva contra otro lane que tomó el único run disponible).
const IDLE_RETRIES = 3;
const IDLE_DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTitleLane(deadline: number): Promise<boolean> {
  let didWork = false;
  let idleStreak = 0;
  while (Date.now() < deadline) {
    const did = await processNext();
    if (did) {
      didWork = true;
      idleStreak = 0;
      continue;
    }
    idleStreak += 1;
    if (idleStreak >= IDLE_RETRIES) break;
    await sleep(IDLE_DELAY_MS);
  }
  return didWork;
}

async function runSyncLane(deadline: number): Promise<boolean> {
  let didWork = false;
  let idleStreak = 0;
  while (Date.now() < deadline) {
    const did = await processNextCategorySync();
    if (did) {
      didWork = true;
      idleStreak = 0;
      continue;
    }
    idleStreak += 1;
    if (idleStreak >= IDLE_RETRIES) break;
    await sleep(IDLE_DELAY_MS);
  }
  return didWork;
}

async function main() {
  const recovered = await recoverStuckTitles();
  if (recovered > 0) {
    console.log(
      `Recuperados ${recovered} título(s) atascado(s) en "processing".`,
    );
  }

  const deadline = Date.now() + BUDGET_MS;

  const results = await Promise.all([
    ...Array.from({ length: SYNC_LANE_CONCURRENCY }, () =>
      runSyncLane(deadline),
    ),
    ...Array.from({ length: TITLE_LANE_CONCURRENCY }, () =>
      runTitleLane(deadline),
    ),
  ]);
  const didAnyWork = results.some(Boolean);

  const deletedEvents = await cleanupOldEvents();
  if (deletedEvents > 0) {
    console.log(`Limpieza: ${deletedEvents} eventos de log viejos borrados.`);
  }

  console.log(
    didAnyWork ? "Trabajo pendiente procesado." : "No había trabajo pendiente.",
  );
}

main()
  .catch((err) => {
    console.error("Error inesperado en run-once:", err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
