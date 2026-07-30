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
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/worker.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
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
