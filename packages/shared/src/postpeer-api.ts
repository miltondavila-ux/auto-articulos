/** Minimal REST client for PostPeer's managed OAuth and publishing API. */
const POSTPEER_API = "https://api.postpeer.dev/v1";

export type PostPeerPlatform = "googlebusiness";

export interface PostPeerIntegration {
  id: string;
  platform: string;
  platformUserId?: string | null;
  displayName?: string | null;
  imageUrl?: string | null;
  profileId?: string | null;
  createdAt?: string;
}

export interface PostPeerPostResult {
  success?: boolean;
  status?: string;
  postId?: string;
  platforms?: Array<{
    platform?: string;
    success?: boolean;
    platformPostUrl?: string;
    error?: string;
    warningMessage?: string;
  }>;
  message?: string;
}

function requireApiKey(apiKey: string): string {
  const value = apiKey.trim();
  if (!value) throw new Error("Falta la clave de API de PostPeer.");
  return value;
}

async function postPeerFetch<T>(apiKey: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${POSTPEER_API}${path}`, {
    ...init,
    headers: {
      "x-access-key": requireApiKey(apiKey),
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    signal: init.signal ?? AbortSignal.timeout(15000),
  });
  const data = (await response.json().catch(() => ({}))) as T & { message?: string; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(data.error?.message ?? data.message ?? `PostPeer respondió ${response.status}.`);
  }
  return data;
}

export async function getPostPeerOAuthUrl(
  apiKey: string,
  platform: PostPeerPlatform,
  params: { profileId: string; redirectUri: string },
): Promise<string> {
  const query = new URLSearchParams({
    profileId: params.profileId,
    redirectUri: params.redirectUri,
  });
  const data = await postPeerFetch<{ url?: string }>(apiKey, `/connect/${platform}?${query}`);
  if (!data.url) throw new Error("PostPeer no devolvió una URL de conexión.");
  return data.url;
}

export async function createPostPeerProfile(apiKey: string, name: string): Promise<string> {
  const data = await postPeerFetch<{ profile?: { id?: string } }>(apiKey, "/profiles", {
    method: "POST",
    body: JSON.stringify({ name: name.trim().slice(0, 200) || "Auto Artículos" }),
  });
  if (!data.profile?.id) throw new Error("PostPeer no devolvió el perfil creado.");
  return data.profile.id;
}

export async function listPostPeerIntegrations(
  apiKey: string,
  params: { platform: PostPeerPlatform; profileId: string },
): Promise<PostPeerIntegration[]> {
  const query = new URLSearchParams({ platform: params.platform, profileId: params.profileId, limit: "100" });
  const data = await postPeerFetch<{ integrations?: PostPeerIntegration[] }>(apiKey, `/connect/integrations?${query}`);
  return (data.integrations ?? []).filter((item) => item.platform === params.platform);
}

export async function createPostPeerPost(
  apiKey: string,
  input: {
    accountId: string;
    content: string;
    imageUrl?: string;
    idempotencyKey: string;
  },
): Promise<PostPeerPostResult> {
  return postPeerFetch<PostPeerPostResult>(apiKey, "/posts", {
    method: "POST",
    body: JSON.stringify({
      content: input.content,
      platforms: [{ platform: "googlebusiness", accountId: input.accountId }],
      ...(input.imageUrl ? { mediaItems: [{ type: "image", url: input.imageUrl }] } : {}),
      publishNow: true,
      idempotencyKey: input.idempotencyKey,
    }),
  });
}

export async function testPostPeerConnection(apiKey: string): Promise<void> {
  await postPeerFetch(apiKey, "/health/auth");
}

export async function disconnectPostPeerIntegration(apiKey: string, accountId: string): Promise<void> {
  await postPeerFetch(apiKey, `/connect/integrations/${encodeURIComponent(accountId)}`, { method: "DELETE" });
}
