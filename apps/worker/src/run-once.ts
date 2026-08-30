import "dotenv/config";
import { processNext } from "./queue";
import { processNextCategorySync, processNextSiteDetection } from "./categorySync";
import { processNextLanguageSync } from "./languageSync";
import { processNextBusinessProfilePost } from "./businessProfilePublish";
import { processNextSocialPublish } from "./socialPublish";
import {
  cleanupOldEvents,
  recoverStuckTitles,
  recoverStuckSyncJobs,
  recoverStuckSocialOpportunities,
} from "./cleanup";

// Pensado para correr en un runner efímero (GitHub Actions), no como proceso
// 24/7 como index.ts. Procesa todo el trabajo pendiente hasta que no quede
// nada, o hasta agotar el presupuesto de tiempo (para no exceder el límite
// del job y dejar que la siguiente corrida programada continúe).
//
// Bajado de 18 a 15 minutos el 10/8/2026: causa raíz confirmada con evidencia
// directa de logs de que el job entero (instalar dependencias + Chromium +
// este script) llegaba a rozar o superar por segundos el límite de 20 min
// del workflow (ver .github/workflows/worker.yml) — un caso documentado
// terminó de forma limpia ("Trabajo pendiente procesado.") apenas 7 segundos
// DESPUÉS del límite, y GitHub Actions lo mató a mitad de la salida (SIGKILL,
// sin dejar correr los `finally` que liberan la reserva del usuario o marcan
// el título para reintentar) en vez de dejarlo completar solo. La razón es
// que `Date.now() < deadline` solo se revisa ENTRE unidades de trabajo, no
// DURANTE una: si el último artículo en curso justo al vencer el presupuesto
// tarda un poco más de lo normal (reintentos de imagen, generación de
// contenido lenta, etc.), el script sigue esperando a que termine antes de
// cortar, y ese excedente sumado al ~45s de instalación de dependencias podía
// empujar el total por encima de los 20 min. Se baja a 15 min (con el límite
// del job subido a 25 min como red de seguridad) para dejar varios minutos de
// margen real en vez de unos pocos segundos.
const BUDGET_MS = 15 * 60 * 1000;

// Cuántos usuarios distintos se procesan en paralelo (cada uno con su propia
// sesión de 10minutesWebsite, nunca dos lanes en la misma cuenta a la vez —
// ver reservation.ts). Pedido explícito del usuario (31/7/2026): que el
// trabajo de un usuario no quede esperando a que termine el de otro.
// Los runners estándar para repos públicos tienen 4 CPU/16 GB. Cuatro lanes
// mayormente esperan red/IA, por lo que 10 shards × 4 lanes dan capacidad real
// para 40 usuarios sin consumir los 20 jobs máximos de la cuenta Free.
const TITLE_LANE_CONCURRENCY = 4;

// Sincronizar categorías es mucho más rápido que publicar un artículo (solo
// lee un <select>, no genera contenido/imagen con IA), así que puede tener
// más carriles sin pesar tanto en el runner. Pedido explícito del usuario:
// que sincronizar categorías no haga esperar tanto.
const CATEGORY_SYNC_LANE_CONCURRENCY = 2;
const SYNC_LANE_CONCURRENCY = 1;

// Antes se apagaban tras solo 1.5 segundos sin trabajo; como
// triggerWorkerNow() no dispara otra corrida mientras una siga activa, los
// usuarios que llegaban después perdían esa capacidad y quedaban haciendo
// cola hasta el próximo workflow. Se subió a 15 min completos (siempre
// vivos) para resolver eso — pero el extremo opuesto tiene un costo real:
// una corrida sin nada pendiente ocupa el único turno del concurrency
// group durante 15 minutos completos, y cualquier código nuevo recién
// desplegado queda esperando detrás de ella (medido en vivo el 15/8/2026:
// media hora de espera real para ver un log). Este punto medio deja cada
// lane vivo unos segundos por si llega algo cerca, sin bloquear el turno
// entero cuando de verdad no hay nada.
const IDLE_DELAY_MS = 5_000;
const IDLE_EXIT_MS = 30 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Corre una unidad de trabajo en bucle hasta agotar el presupuesto de tiempo.
 *
 * El try/catch es la parte importante, y viene de un bug real de producción
 * (14/8/2026, corrida 31839053190): con 8 lanes por proceso compartiendo un
 * pool de 5 conexiones de Prisma, una consulta puede fallar con P2024
 * ("Timed out fetching a new connection from the connection pool"). Antes ese
 * error subía hasta el `Promise.all` de main(), tumbaba el proceso ENTERO —
 * los otros 7 lanes incluidos — y, al morir sin ejecutar los `finally`,
 * dejaba jobs a medias en estado "running" que ya nadie volvía a tocar (ver
 * recoverStuckSyncJobs en cleanup.ts). Un timeout de pool es transitorio: lo
 * correcto es registrarlo, esperar y reintentar, no matar el shard.
 */
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
      console.log(`Lane "${laneName}": inicia unidad de trabajo.`);
      const did = await processOne();
      console.log(
        `Lane "${laneName}": unidad terminó en ${Date.now() - startedAt}ms (trabajo=${did}).`,
      );
      if (did) {
        didWork = true;
        idleSince = Date.now();
        continue;
      }
    } catch (err) {
      console.error(
        `Lane "${laneName}" falló en esta vuelta (se reintenta, el shard sigue vivo):`,
        err,
      );
    }
    if (Date.now() - idleSince >= IDLE_EXIT_MS) break;
    await sleep(IDLE_DELAY_MS);
  }
  return didWork;
}

async function main() {
  const workerMode = process.env.WORKER_MODE ?? "all";
  const isSocialOnly = workerMode === "social";
  const isContentOnly = workerMode === "content";
  // Con varios shards, ejecutar mantenimiento en todos duplicaría consultas y
  // limpiezas. El shard 1 se encarga; todos publican en paralelo.
  const isMaintenanceShard = (process.env.WORKER_SHARD ?? "1") === "1";
  if (isMaintenanceShard && !isSocialOnly) {
    const recovered = await recoverStuckTitles();
    if (recovered > 0) {
      console.log(
        `Recuperados ${recovered} título(s) atascado(s) en "processing".`,
      );
    }
    const recoveredSyncJobs = await recoverStuckSyncJobs();
    if (recoveredSyncJobs > 0) {
      console.log(
        `Recuperados ${recoveredSyncJobs} job(s) de sincronización atascado(s) en "running".`,
      );
    }
  }
  if (isMaintenanceShard && !isContentOnly) {
    const recoveredSocial = await recoverStuckSocialOpportunities();
    if (recoveredSocial > 0) {
      console.log(
        `Recuperadas ${recoveredSocial} publicación(es) social(es) atascada(s).`,
      );
    }
  }

  const deadline = Date.now() + BUDGET_MS;

  const lanes: Promise<boolean>[] = [];
  if (!isSocialOnly) {
    lanes.push(
      ...Array.from({ length: CATEGORY_SYNC_LANE_CONCURRENCY }, () =>
        runLane("categorías", processNextCategorySync, deadline),
      ),
      runLane("detección de sitios", processNextSiteDetection, deadline),
      ...Array.from({ length: SYNC_LANE_CONCURRENCY }, () =>
        runLane("idiomas", processNextLanguageSync, deadline),
      ),
      ...Array.from({ length: SYNC_LANE_CONCURRENCY }, () =>
        runLane("perfil de negocio", processNextBusinessProfilePost, deadline),
      ),
      ...Array.from({ length: TITLE_LANE_CONCURRENCY }, () =>
        runLane("títulos", processNext, deadline),
      ),
    );
  }
  if (!isContentOnly) {
    lanes.push(runLane("redes sociales", processNextSocialPublish, deadline));
  }
  const results = await Promise.all(lanes);
  const didAnyWork = results.some(Boolean);

  if (isMaintenanceShard && !isSocialOnly) {
    const deletedEvents = await cleanupOldEvents();
    if (deletedEvents > 0) {
      console.log(`Limpieza: ${deletedEvents} eventos de log viejos borrados.`);
    }
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
