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

export async function createMastodonStatus(instanceUrl: string, accessToken: string, text: string, mediaId?: string) {
  return request<MastodonStatus>(instanceUrl, "/api/v1/statuses", accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ status: text.slice(0, 500), visibility: "public", ...(mediaId ? { media_ids: [mediaId] } : {}) }),
  });
}
