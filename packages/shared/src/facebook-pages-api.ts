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
  const identityParams = new URLSearchParams({ fields: "id,name", access_token: accessToken });
  const identityRes = await fetch(`${GRAPH_API_URL}/me?${identityParams.toString()}`);
  if (!identityRes.ok) {
    throw new Error(`La autorización de Facebook Pages no es válida: ${await identityRes.text()}`);
  }
  const identity = (await identityRes.json()) as { id?: string; name?: string };
  if (!identity.id || identity.id !== pageId) {
    throw new Error("La autorización de Meta no corresponde a la Página de Facebook seleccionada. Vuelve a conectar Meta y selecciona la Página correcta.");
  }

  const endpoint = imageUrl ? `${GRAPH_API_URL}/${pageId}/photos` : `${GRAPH_API_URL}/${pageId}/feed`;
  const body = new URLSearchParams({ access_token: accessToken });
  if (imageUrl) {
    body.set("url", imageUrl);
    body.set("caption", caption);
    body.set("published", "true");
  } else {
    body.set("message", caption);
  }

  const res = await fetch(endpoint, { method: "POST", body });
  if (!res.ok) {
    throw new Error(`Error al publicar en Facebook Pages: ${await res.text()}`);
  }
  const data = (await res.json()) as { id?: string; post_id?: string };
  const postId = data.post_id || data.id || "";
  if (!postId) {
    throw new Error("Facebook Pages aceptó la solicitud pero no devolvió el identificador de la publicación.");
  }
  return { postId, permalink: postId ? `https://www.facebook.com/${postId}` : undefined };
}
