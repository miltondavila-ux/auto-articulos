import "dotenv/config";
import { processNext } from "./queue";
import { processNextCategorySync, processNextSiteDetection } from "./categorySync";
import { processNextSocialPublish } from "./socialPublish";

const POLL_INTERVAL_MS = 3000;
const IDLE_TIMEOUT_MS = parseInt(process.env.WORKER_IDLE_TIMEOUT_MS || "0", 10);
let stopping = false;
let lastWorkTime = Date.now();

async function loop() {
  while (!stopping) {
    if (IDLE_TIMEOUT_MS > 0 && Date.now() - lastWorkTime > IDLE_TIMEOUT_MS) {
      console.log(`Worker inactivo por ${IDLE_TIMEOUT_MS / 1000}s. Cerrando automáticamente.`);
      stopping = true;
      break;
    }
    try {
      const didDetectWork = await processNextSiteDetection();
      const didSyncWork = await processNextCategorySync();
      const didRunWork = await processNext();
      const didSocialPublish = await processNextSocialPublish();
      if (didDetectWork || didSyncWork || didRunWork || didSocialPublish) {
        lastWorkTime = Date.now();
      }
      await sleep(
        didDetectWork || didSyncWork || didRunWork || didSocialPublish
          ? 500
          : POLL_INTERVAL_MS,
      );
    } catch (err) {
      console.error("Error inesperado en el worker:", err);
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});

console.log("Auto Artículos worker iniciado. Escuchando ejecuciones pendientes...");
loop();
