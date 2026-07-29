import "dotenv/config";
import { processNext } from "./queue";
import { processNextCategorySync } from "./categorySync";

// Pensado para correr en un runner efímero (GitHub Actions), no como proceso
// 24/7 como index.ts. Procesa todo el trabajo pendiente hasta que no quede
// nada, o hasta agotar el presupuesto de tiempo (para no exceder el límite
// del job y dejar que la siguiente corrida programada continúe).
const BUDGET_MS = 18 * 60 * 1000;

async function main() {
  const deadline = Date.now() + BUDGET_MS;
  let didAnyWork = false;

  while (Date.now() < deadline) {
    const didSyncWork = await processNextCategorySync();
    const didRunWork = await processNext();

    if (!didSyncWork && !didRunWork) break;
    didAnyWork = true;
  }

  console.log(didAnyWork ? "Trabajo pendiente procesado." : "No había trabajo pendiente.");
}

main()
  .catch((err) => {
    console.error("Error inesperado en run-once:", err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
