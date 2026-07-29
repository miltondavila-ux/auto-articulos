/**
 * Dispara de inmediato el workflow del worker en GitHub Actions, en vez de
 * esperar a que corra por su horario (cada 5 minutos como respaldo). Si esto
 * falla (token vencido, sin permisos, etc.) no debe romper la petición del
 * usuario: el respaldo por horario sigue funcionando de todos modos.
 */
export async function triggerWorkerNow(): Promise<void> {
  const token = process.env.GITHUB_ACTIONS_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) return;

  try {
    await fetch(`https://api.github.com/repos/${repo}/actions/workflows/worker.yml/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: "main" }),
    });
  } catch (err) {
    console.error("No se pudo disparar el worker de inmediato:", err);
  }
}
