const GITHUB_API_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

/**
 * Revisa si ya hay una corrida del worker en curso o en cola en GitHub
 * Actions. Encontrado en vivo el 31/7/2026 con ~40 usuarios probando a la
 * vez: como `worker.yml` solo permite una corrida a la vez
 * (`concurrency: group: auto-articulos-worker`), cada `workflow_dispatch`
 * nuevo que llegaba mientras había uno EN COLA cancelaba al anterior en
 * cola (GitHub solo mantiene una corrida en espera por grupo) — una
 * "guerra de disparos" que dejaba trabajo pendiente esperando de más. Como
 * la corrida en curso vuelve a revisar la base de datos en cada vuelta de
 * su loop (ver `run-once.ts`), no hace falta disparar otra si ya hay una
 * activa: va a recoger el trabajo nuevo sola.
 *
 * Solo cuentan las corridas RECIENTES. Bug confirmado en producción el
 * 26/8/2026: la corrida #1434 quedó zombi en `queued` desde las 15:14 UTC y,
 * como esta función solo miraba `total_count`, devolvió `true` durante horas —
 * `triggerWorkerNow()` dejó de disparar por completo y publicar solo dependía
 * del horario, que además se espació a ~2 horas por el mismo grupo de
 * concurrencia trabado. Una corrida más vieja que el límite del job
 * (`timeout-minutes: 25` en worker.yml) ya no puede estar viva.
 */
const MAX_ACTIVE_RUN_AGE_MS = 30 * 60 * 1000;

export type WorkerTriggerResult = {
  started: boolean;
  alreadyActive?: boolean;
  reason?: "missing_configuration" | "github_rejected" | "network_error";
};

async function isWorkerAlreadyActive(
  token: string,
  repo: string,
  workflow: string,
): Promise<boolean> {
  for (const status of ["in_progress", "queued"]) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/runs?status=${status}&per_page=1`,
        { headers: GITHUB_API_HEADERS(token) },
      );
      if (!res.ok) continue; // si la consulta falla, no bloqueamos el disparo por las dudas
      const data = (await res.json()) as {
        workflow_runs?: { created_at?: string }[];
      };
      const run = data.workflow_runs?.[0];
      if (!run) continue;
      const createdAt = run.created_at ? Date.parse(run.created_at) : NaN;
      if (Number.isNaN(createdAt)) return true;
      if (Date.now() - createdAt < MAX_ACTIVE_RUN_AGE_MS) return true;
    } catch {
      // Ignorar y seguir revisando (o disparar de todos modos si ninguna
      // consulta pudo confirmar que ya hay una corrida activa).
    }
  }
  return false;
}

/**
 * Dispara de inmediato el workflow del worker en GitHub Actions, en vez de
 * esperar a que corra por su horario (cada 5 minutos como respaldo). Si esto
 * falla (token vencido, sin permisos, etc.) no debe romper la petición del
 * usuario: el respaldo por horario sigue funcionando de todos modos.
 */
async function triggerWorkflowNow(
  workflow: string,
  label: string,
): Promise<WorkerTriggerResult> {
  const token = process.env.GITHUB_ACTIONS_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.error(
      `${label}: falta GITHUB_ACTIONS_TOKEN o GITHUB_REPO; se depende del horario.`,
    );
    return { started: false, reason: "missing_configuration" };
  }

  try {
    if (await isWorkerAlreadyActive(token, repo, workflow)) {
      return { started: false, alreadyActive: true };
    }

    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`,
      {
        method: "POST",
        headers: GITHUB_API_HEADERS(token),
        body: JSON.stringify({ ref: "main" }),
      },
    );
    // fetch() no lanza excepción en respuestas 4xx/5xx (token vencido, repo
    // mal configurado, etc.) — sin este chequeo, un disparo fallido pasaba
    // desapercibido y todo quedaba dependiendo del horario cada 5 minutos
    // (que además puede demorarse varios minutos más por el lado de
    // GitHub), lo que explica esperas de hasta 15 minutos.
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `${label}: GitHub respondió ${res.status} al intentar disparar el workflow: ${body}`,
      );
      return { started: false, reason: "github_rejected" };
    }
    return { started: true };
  } catch (err) {
    console.error(`${label}: no se pudo disparar el workflow:`, err);
    return { started: false, reason: "network_error" };
  }
}

export function triggerWorkerNow(): Promise<WorkerTriggerResult> {
  return triggerWorkflowNow("worker.yml", "triggerWorkerNow");
}

export function triggerSocialWorkerNow(): Promise<WorkerTriggerResult> {
  return triggerWorkflowNow("social-worker.yml", "triggerSocialWorkerNow");
}
