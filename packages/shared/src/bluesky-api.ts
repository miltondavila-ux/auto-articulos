import { truncateGraphemes } from "./caption-limits";

const BLUESKY_PDS = "https://bsky.social";

type BlueskySession = { accessJwt: string; did: string; handle: string };

async function request<T>(path: string, accessJwt: string | undefined, body: unknown): Promise<T> {
  const response = await fetch(`${BLUESKY_PDS}/xrpc/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(accessJwt ? { Authorization: `Bearer ${accessJwt}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Bluesky API falló (${response.status}): ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function uploadBlob(accessJwt: string, bytes: Uint8Array, contentType: string) {
  const response = await fetch(`${BLUESKY_PDS}/xrpc/com.atproto.repo.uploadBlob`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessJwt}`, "Content-Type": contentType },
    body: Buffer.from(bytes),
  });
  if (!response.ok) throw new Error(`No se pudo subir la imagen a Bluesky: ${await response.text()}`);
  return response.json() as Promise<{ blob: unknown }>;
}

export async function createBlueskySession(handle: string, appPassword: string) {
  return request<BlueskySession>("com.atproto.server.createSession", undefined, { identifier: handle, password: appPassword });
}

export async function createBlueskyPost(session: BlueskySession, text: string, imageUrl?: string | null) {
  // Bluesky cuenta por "graphemes" (caracteres visibles), no por unidades
  // UTF-16 de JS — .slice(0,300) puede partir un emoji a la mitad. El texto
  // ya debería llegar acá dentro del límite (ver buildSafeCaption en el
  // worker); esto queda como red de seguridad.
  const safeText = truncateGraphemes(text, 300);
  const record: Record<string, unknown> = { $type: "app.bsky.feed.post", text: safeText, createdAt: new Date().toISOString() };
  if (imageUrl) {
    const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (imageResponse.ok) {
      const blob = await uploadBlob(session.accessJwt, new Uint8Array(await imageResponse.arrayBuffer()), imageResponse.headers.get("content-type") || "image/jpeg");
      record.embed = { $type: "app.bsky.embed.images", images: [{ alt: safeText, image: blob.blob }] };
    }
  }
  return request<{ uri: string; cid: string }>("com.atproto.repo.createRecord", session.accessJwt, { repo: session.did, collection: "app.bsky.feed.post", record });
}

export function getBlueskyPostUrl(handle: string, rkey: string) {
  return `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(rkey)}`;
}
