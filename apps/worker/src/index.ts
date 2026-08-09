import "dotenv/config";
import { processNext } from "./queue";
import { processNextCategorySync } from "./categorySync";
import { processNextSocialPublish } from "./socialPublish";

const POLL_INTERVAL_MS = 3000;
let stopping = false;

async function loop() {
  while (!stopping) {
    try {
      const didSyncWork = await processNextCategorySync();
      const didRunWork = await processNext();
      const didSocialPublish = await processNextSocialPublish();
      await sleep(didSyncWork || didRunWork || didSocialPublish ? 500 : POLL_INTERVAL_MS);
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
