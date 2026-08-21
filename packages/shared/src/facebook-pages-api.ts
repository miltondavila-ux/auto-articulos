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

/**
 * Publica una Historia (Story) estática en una Página de Facebook.
 * A diferencia de un post normal, requiere dos pasos: subir la foto SIN
 * publicar (para obtener un photo_id) y luego crear la historia a partir
 * de ese photo_id. No acepta caption — igual que la Historia de Instagram,
 * el texto de la oportunidad no se usa para esta llamada.
 * https://developers.facebook.com/docs/page-stories-api/
 */
export async function publishFacebookPageStory(
  accessToken: string,
  pageId: string,
  imageUrl: string,
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

  const uploadBody = new URLSearchParams({
    url: imageUrl,
    published: "false",
    access_token: accessToken,
  });
  const uploadRes = await fetch(`${GRAPH_API_URL}/${pageId}/photos`, { method: "POST", body: uploadBody });
  if (!uploadRes.ok) {
    throw new Error(`Error al subir la imagen de la Historia a Facebook: ${await uploadRes.text()}`);
  }
  const uploadData = (await uploadRes.json()) as { id?: string };
  const photoId = uploadData.id;
  if (!photoId) {
    throw new Error("Facebook aceptó la imagen pero no devolvió su identificador (photo_id).");
  }

  const storyBody = new URLSearchParams({ photo_id: photoId, access_token: accessToken });
  const storyRes = await fetch(`${GRAPH_API_URL}/${pageId}/photo_stories`, { method: "POST", body: storyBody });
  if (!storyRes.ok) {
    throw new Error(`Error al publicar la Historia en Facebook: ${await storyRes.text()}`);
  }
  const storyData = (await storyRes.json()) as { post_id?: string; success?: boolean };
  const postId = storyData.post_id || "";
  if (!postId) {
    throw new Error("Facebook aceptó la Historia pero no devolvió su identificador (post_id).");
  }
  return { postId, permalink: `https://www.facebook.com/stories/${postId}` };
}
