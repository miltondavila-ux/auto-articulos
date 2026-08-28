const GRAPH_API_VERSION = "v25.0";
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface FacebookPagePublishResult {
  postId: string;
  permalink?: string;
}

/** Publica la imagen destacada del artículo en una Página de Facebook. */
export async function publishFacebookPagePost(
  accessToken: string,
  pageId: string,
  caption: string,
  imageUrl?: string,
): Promise<FacebookPagePublishResult> {
  const endpoint = imageUrl ? `${GRAPH_API_URL}/${pageId}/photos` : `${GRAPH_API_URL}/${pageId}/feed`;
  const body = new URLSearchParams({ access_token: accessToken });
  if (imageUrl) {
    body.set("url", imageUrl);
    body.set("caption", caption);
  } else {
    body.set("message", caption);
  }

  const res = await fetch(endpoint, { method: "POST", body });
  if (!res.ok) {
    throw new Error(`Error al publicar en Facebook Pages: ${await res.text()}`);
  }
  const data = (await res.json()) as { id?: string; post_id?: string };
  const postId = data.post_id || data.id || "";
  return { postId, permalink: postId ? `https://www.facebook.com/${postId}` : undefined };
}
