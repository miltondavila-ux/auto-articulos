const GITHUB_API_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

export type WorkerTriggerResult = {
  started: boolean;
  alreadyActive?: boolean;
  reason?: "missing_configuration" | "github_rejected" | "network_error";
};

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
