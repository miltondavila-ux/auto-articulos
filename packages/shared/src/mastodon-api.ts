export type MastodonAccount = { username?: string; display_name?: string; url?: string };
export type MastodonStatus = { id: string; url?: string; uri?: string };

function baseUrl(instanceUrl: string) {
  return instanceUrl.replace(/\/+$/, "");
}

async function request<T>(instanceUrl: string, path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl(instanceUrl)}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  if (!response.ok) throw new Error(`Mastodon API falló (${response.status}): ${await response.text()}`);
  return response.json() as Promise<T>;
}

export async function verifyMastodonToken(instanceUrl: string, accessToken: string) {
  return request<MastodonAccount>(instanceUrl, "/api/v1/accounts/verify_credentials", accessToken);
}

export async function createMastodonMedia(instanceUrl: string, accessToken: string, bytes: Uint8Array, contentType: string, description: string) {
  const form = new FormData();
  form.append("file", new Blob([bytes as unknown as BlobPart], { type: contentType }), "article-image");
  form.append("description", description.slice(0, 1500));
  return request<{ id: string }>(instanceUrl, "/api/v2/media", accessToken, { method: "POST", body: form });
}

/**
 * Auditoría de seguridad anti-SPAM (30/8/2026): idempotencyKey DEBE ser
 * estable entre reintentos de la MISMA publicación (documentación oficial:
 * https://docs.joinmastodon.org/methods/statuses/ — Mastodon guarda la clave
 * hasta 1 hora y descarta silenciosamente un envío repetido con la misma
 * clave, devolviendo el status ya creado). Antes se generaba un
 * crypto.randomUUID() nuevo en CADA llamada, lo que anulaba por completo la
 * protección: un timeout donde Mastodon sí recibió el post pero la
 * respuesta no llegó a nuestro worker terminaba en una publicación
 * duplicada real en el siguiente reintento, porque la clave nueva no
 * coincidía con la anterior. El llamador debe pasar una clave derivada del
 * id real de la publicación (ej. el id de SocialOpportunity), no generarla
 * acá.
 */
export async function createMastodonStatus(instanceUrl: string, accessToken: string, text: string, idempotencyKey: string, mediaId?: string) {
  return request<MastodonStatus>(instanceUrl, "/api/v1/statuses", accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ status: text.slice(0, 500), visibility: "public", ...(mediaId ? { media_ids: [mediaId] } : {}) }),
  });
}
