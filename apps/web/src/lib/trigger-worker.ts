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
 */
async function isWorkerAlreadyActive(
  token: string,
  repo: string,
): Promise<boolean> {
  for (const status of ["in_progress", "queued"]) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/actions/workflows/worker.yml/runs?status=${status}&per_page=1`,
        { headers: GITHUB_API_HEADERS(token) },
      );
      if (!res.ok) continue; // si la consulta falla, no bloqueamos el disparo por las dudas
      const data = (await res.json()) as { total_count?: number };
      if ((data.total_count ?? 0) > 0) return true;
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
export async function triggerWorkerNow(): Promise<void> {
  const token = process.env.GITHUB_ACTIONS_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.error(
      "triggerWorkerNow: falta GITHUB_ACTIONS_TOKEN o GITHUB_REPO, se depende solo del horario (cada 5 min, con posible demora extra de GitHub).",
    );
    return;
  }

  try {
    if (await isWorkerAlreadyActive(token, repo)) {
      return;
    }

    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/worker.yml/dispatches`,
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
        `triggerWorkerNow: GitHub respondió ${res.status} al intentar disparar el worker de inmediato: ${body}`,
      );
    }
  } catch (err) {
    console.error("No se pudo disparar el worker de inmediato:", err);
  }
}
