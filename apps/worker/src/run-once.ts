import "dotenv/config";
import { processNext } from "./queue";
import { processNextCategorySync } from "./categorySync";
import { processNextLanguageSync } from "./languageSync";
import { processNextBusinessProfilePost } from "./businessProfilePublish";
import { processNextSocialPublish } from "./socialPublish";
import { cleanupOldEvents, recoverStuckTitles } from "./cleanup";

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
const SYNC_LANE_CONCURRENCY = 1;

// Los lanes permanecen disponibles durante toda la ventana. Antes se apagaban
// tras solo 1.5 segundos sin trabajo; como triggerWorkerNow() no dispara otra
// corrida mientras una siga activa, los usuarios que llegaban después perdían
// esa capacidad y quedaban haciendo cola hasta el próximo workflow.
const IDLE_DELAY_MS = 5_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTitleLane(deadline: number): Promise<boolean> {
  let didWork = false;
  while (Date.now() < deadline) {
    const did = await processNext();
    if (did) {
      didWork = true;
      continue;
    }
    await sleep(IDLE_DELAY_MS);
  }
  return didWork;
}

async function runSyncLane(deadline: number): Promise<boolean> {
  let didWork = false;
  while (Date.now() < deadline) {
    const did = await processNextCategorySync();
    if (did) {
      didWork = true;
      continue;
    }
    await sleep(IDLE_DELAY_MS);
  }
  return didWork;
}

async function runLanguageSyncLane(deadline: number): Promise<boolean> {
  let didWork = false;
  while (Date.now() < deadline) {
    const did = await processNextLanguageSync();
    if (did) {
      didWork = true;
      continue;
    }
    await sleep(IDLE_DELAY_MS);
  }
  return didWork;
}

async function runBusinessProfileLane(deadline: number): Promise<boolean> {
  let didWork = false;
  while (Date.now() < deadline) {
    const did = await processNextBusinessProfilePost();
    if (did) {
      didWork = true;
      continue;
    }
    await sleep(IDLE_DELAY_MS);
  }
  return didWork;
}

async function runSocialPublishLane(deadline: number): Promise<boolean> {
  let didWork = false;
  while (Date.now() < deadline) {
    const did = await processNextSocialPublish();
    if (did) {
      didWork = true;
      continue;
    }
    await sleep(IDLE_DELAY_MS);
  }
  return didWork;
}

async function main() {
  // Con varios shards, ejecutar mantenimiento en todos duplicaría consultas y
  // limpiezas. El shard 1 se encarga; todos publican en paralelo.
  const isMaintenanceShard = (process.env.WORKER_SHARD ?? "1") === "1";
  if (isMaintenanceShard) {
    const recovered = await recoverStuckTitles();
    if (recovered > 0) {
      console.log(
        `Recuperados ${recovered} título(s) atascado(s) en "processing".`,
      );
    }
  }

  const deadline = Date.now() + BUDGET_MS;

  const results = await Promise.all([
    ...Array.from({ length: SYNC_LANE_CONCURRENCY }, () =>
      runSyncLane(deadline),
    ),
    ...Array.from({ length: SYNC_LANE_CONCURRENCY }, () =>
      runLanguageSyncLane(deadline),
    ),
    ...Array.from({ length: SYNC_LANE_CONCURRENCY }, () =>
      runBusinessProfileLane(deadline),
    ),
    ...Array.from({ length: SYNC_LANE_CONCURRENCY }, () =>
      runSocialPublishLane(deadline),
    ),
    ...Array.from({ length: TITLE_LANE_CONCURRENCY }, () =>
      runTitleLane(deadline),
    ),
  ]);
  const didAnyWork = results.some(Boolean);

  if (isMaintenanceShard) {
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
