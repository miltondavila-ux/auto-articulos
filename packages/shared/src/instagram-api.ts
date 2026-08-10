/**
 * Módulo de integración con Instagram Graph API (Meta)
 * Documentación oficial: https://developers.facebook.com/docs/instagram-api
 *
 * Soporta:
 * - Imagen individual (para Reel-style e Infografías)
 * - Carousels (hasta 5 imágenes)
 *
 * Flujo OAuth 2.0 idéntico al de Threads: Short-Lived Token → Long-Lived Token.
 */

const GRAPH_API_VERSION = "v25.0";
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface InstagramTokenExchangeResult {
  longLivedToken: string;
  expiresInSeconds: number;
  instagramBusinessAccountId: string;
  instagramUsername: string;
}

export interface InstagramPublishResult {
  postId: string;
  permalink?: string;
}

/**
 * Obtiene las credenciales de la aplicación de Instagram (App ID y App Secret).
 */
export function getInstagramAppCredentials(overrideId?: string, overrideSecret?: string) {
  const appId = overrideId || process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID;
  const appSecret = overrideSecret || process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error(
      "La App ID y App Secret de Instagram (Meta) no han sido configuradas todavía."
    );
  }

  return { appId, appSecret };
}

/**
 * Genera la URL de autorización OAuth 2.0 para Instagram (Meta Graph API).
 * Necesita los scopes: instagram_basic, instagram_content_publish, pages_show_list.
 */
export function getInstagramAuthUrl(
  state: string,
  redirectUri: string,
  appCredentials?: { appId: string; appSecret: string }
): string {
  const { appId } = appCredentials || getInstagramAppCredentials();
  const scope = "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management";
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope,
    response_type: "code",
    state,
    auth_type: "rerequest",
  });

  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
}

/**
 * Canjea el código de autorización por un Long-Lived Token y obtiene el
 * Instagram Business Account ID del usuario.
 */
export async function exchangeCodeForInstagramTokens(
  code: string,
  redirectUri: string,
  appCredentials?: { appId: string; appSecret: string }
): Promise<InstagramTokenExchangeResult> {
  const { appId, appSecret } = appCredentials || getInstagramAppCredentials();

  // Paso 1: Canjear code por Short-Lived Access Token
  const shortLivedBody = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const shortLivedRes = await fetch(`${GRAPH_API_URL}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: shortLivedBody.toString(),
  });

  if (!shortLivedRes.ok) {
    const errorText = await shortLivedRes.text();
    throw new Error(`Error al obtener Short-Lived Token de Instagram: ${errorText}`);
  }

  const shortLivedData = (await shortLivedRes.json()) as {
    access_token: string;
  };

  const shortLivedToken = shortLivedData.access_token;

  // Paso 2: Canjear Short-Lived Token por Long-Lived Token (60 días)
  const longLivedParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const longLivedRes = await fetch(
    `${GRAPH_API_URL}/oauth/access_token?${longLivedParams.toString()}`,
    { method: "GET" }
  );

  if (!longLivedRes.ok) {
    const errorText = await longLivedRes.text();
    throw new Error(`Error al canjear Long-Lived Token de Instagram: ${errorText}`);
  }

  const longLivedData = (await longLivedRes.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
  };

  const longLivedToken = longLivedData.access_token;
  let publishingAccessToken = longLivedToken;
  const expiresInSeconds = longLivedData.expires_in || 60 * 86400;

  // Paso 3: Obtener las páginas de Facebook del usuario
  const pagesRes = await fetch(
    `${GRAPH_API_URL}/me/accounts?fields=id,name,access_token&access_token=${longLivedToken}`
  );

  if (!pagesRes.ok) {
    const errorText = await pagesRes.text();
    throw new Error(`Error al obtener páginas de Facebook: ${errorText}`);
  }

  const pagesData = (await pagesRes.json()) as {
    data?: { id: string; name: string; access_token: string }[];
  };

  if (!pagesData.data || pagesData.data.length === 0) {
    throw new Error(
      "No se encontraron páginas de Facebook vinculadas a esta cuenta. " +
      "Necesitas una página de Facebook para usar la API de Instagram."
    );
  }

  // Usar la primera página que tenga Instagram Business Account
  let instagramBusinessAccountId = "";
  let instagramUsername = "";

  for (const page of pagesData.data) {
    const pageRes = await fetch(
      `${GRAPH_API_URL}/${page.id}?fields=instagram_business_account{id,username}&access_token=${longLivedToken}`
    );

    if (pageRes.ok) {
      const pageData = (await pageRes.json()) as {
        instagram_business_account?: { id: string; username?: string };
      };

      if (pageData.instagram_business_account) {
        instagramBusinessAccountId = pageData.instagram_business_account.id;
        instagramUsername = pageData.instagram_business_account.username || "";
        publishingAccessToken = page.access_token || longLivedToken;
        break;
      }
    }
  }

  if (!instagramBusinessAccountId) {
    throw new Error(
      "Ninguna de tus páginas de Facebook tiene una cuenta de Instagram " +
      "profesional (Business/Creator) vinculada. " +
      "Convierte tu cuenta de Instagram a Profesional y vincúlala a una página de Facebook."
    );
  }

  return {
    longLivedToken: publishingAccessToken,
    expiresInSeconds,
    instagramBusinessAccountId,
    instagramUsername,
  };
}

/**
 * Renueva un Long-Lived Token antes de que expire.
 */
export async function refreshInstagramToken(
  accessToken: string
): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    fb_exchange_token: accessToken,
  });

  const res = await fetch(
    `${GRAPH_API_URL}/oauth/access_token?${params.toString()}`,
    { method: "GET" }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al refrescar token de Instagram: ${errorText}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  return {
    accessToken: data.access_token,
    expiresInSeconds: data.expires_in,
  };
}

// ─── PUBLICACIÓN: IMAGEN INDIVIDUAL ───────────────────────────────────────

/**
 * Publica una imagen individual en Instagram.
 * Se usa para Reel-style (imagen vertical 9:16) e Infografías.
 *
 * Flujo:
 * 1. Crear un media container IMAGE
 * 2. Publicar el container
 */
export async function publishInstagramImage(
  accessToken: string,
  instagramBusinessAccountId: string,
  imageUrl: string,
  caption: string
): Promise<InstagramPublishResult> {
  const maxCaption = 2200;
  const safeCaption = caption.length > maxCaption
    ? caption.substring(0, maxCaption - 3) + "..."
    : caption;

  const containerParams = new URLSearchParams({
    media_type: "IMAGE",
    image_url: imageUrl,
    caption: safeCaption,
    is_ai_generated: "true",
    access_token: accessToken,
  });

  const containerRes = await fetch(
    `${GRAPH_API_URL}/${instagramBusinessAccountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: containerParams.toString(),
    }
  );

  if (!containerRes.ok) {
    const errorText = await containerRes.text();
    throw new Error(`Error al crear container de imagen en Instagram: ${errorText}`);
  }

  const containerData = (await containerRes.json()) as { id: string };
  const creationId = containerData.id;

  await pollMediaContainerStatus(accessToken, creationId);

  return publishMediaContainer(accessToken, instagramBusinessAccountId, creationId);
}

// ─── PUBLICACIÓN: CAROUSEL ────────────────────────────────────────────────

/**
 * Publica un Carousel en Instagram (hasta 5 imágenes).
 *
 * Flujo:
 * 1. Crear un media container IMAGE por cada imagen
 * 2. Crear un CAROUSEL container que referencie los children
 * 3. Publicar el carousel container
 */
export async function publishInstagramCarousel(
  accessToken: string,
  instagramBusinessAccountId: string,
  imageUrls: string[],
  caption: string
): Promise<InstagramPublishResult> {
  if (imageUrls.length === 0) {
    throw new Error("El carrusel necesita al menos una imagen.");
  }

  if (imageUrls.length > 5) {
    throw new Error("El carrusel puede tener máximo 5 imágenes.");
  }

  // Límite de caption: 2200 caracteres
  const maxCaption = 2200;
  const safeCaption = caption.length > maxCaption
    ? caption.substring(0, maxCaption - 3) + "..."
    : caption;

  // Paso 1: Crear containers individuales de IMAGE
  const childMediaIds: string[] = [];

  for (const imageUrl of imageUrls) {
    const containerParams = new URLSearchParams({
      media_type: "IMAGE",
      image_url: imageUrl,
      access_token: accessToken,
    });

    const containerRes = await fetch(
      `${GRAPH_API_URL}/${instagramBusinessAccountId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: containerParams.toString(),
      }
    );

    if (!containerRes.ok) {
      const errorText = await containerRes.text();
      throw new Error(`Error al crear container de imagen en Instagram: ${errorText}`);
    }

    const containerData = (await containerRes.json()) as { id: string };
    childMediaIds.push(containerData.id);
  }

  // Esperar a que todos los containers estén listos (polling)
  for (const childId of childMediaIds) {
    await pollMediaContainerStatus(accessToken, childId);
  }

  // Paso 2: Crear el CAROUSEL container
  const carouselParams = new URLSearchParams({
    media_type: "CAROUSEL",
    children: childMediaIds.join(","),
    caption: safeCaption,
    is_ai_generated: "true",
    access_token: accessToken,
  });

  const carouselRes = await fetch(
    `${GRAPH_API_URL}/${instagramBusinessAccountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: carouselParams.toString(),
    }
  );

  if (!carouselRes.ok) {
    const errorText = await carouselRes.text();
    throw new Error(`Error al crear container de carrusel en Instagram: ${errorText}`);
  }

  const carouselData = (await carouselRes.json()) as { id: string };
  const creationId = carouselData.id;

  // Esperar a que el carrusel esté listo
  await pollMediaContainerStatus(accessToken, creationId);

  // Paso 3: Publicar el carrusel
  return publishMediaContainer(accessToken, instagramBusinessAccountId, creationId);
}

// ─── PUBLICACIÓN: REEL ────────────────────────────────────────────────────

/**
 * Publica un Reel en Instagram (video de hasta 60s recomendado, 15 minutos máximo).
 *
 * Flujo:
 * 1. Crear un REELS media container con video_url y thumbnail_url opcional
 * 2. Publicar el reel container
 */
export async function publishInstagramReel(
  accessToken: string,
  instagramBusinessAccountId: string,
  videoUrl: string,
  caption: string,
  thumbnailUrl?: string
): Promise<InstagramPublishResult> {
  if (!videoUrl) {
    throw new Error("El Reel necesita una URL de video.");
  }

  const maxCaption = 2200;
  const safeCaption = caption.length > maxCaption
    ? caption.substring(0, maxCaption - 3) + "..."
    : caption;

  const containerParams: Record<string, string> = {
    media_type: "REELS",
    video_url: videoUrl,
    caption: safeCaption,
    access_token: accessToken,
  };

  if (thumbnailUrl) {
    containerParams.thumbnail_url = thumbnailUrl;
  }

  const containerBody = new URLSearchParams(containerParams);

  const containerRes = await fetch(
    `${GRAPH_API_URL}/${instagramBusinessAccountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: containerBody.toString(),
    }
  );

  if (!containerRes.ok) {
    const errorText = await containerRes.text();
    throw new Error(`Error al crear container de Reel en Instagram: ${errorText}`);
  }

  const containerData = (await containerRes.json()) as { id: string };
  const creationId = containerData.id;

  // Esperar a que el reel esté listo (los videos pueden tardar más)
  await pollMediaContainerStatus(accessToken, creationId, 30);

  // Publicar el reel
  return publishMediaContainer(accessToken, instagramBusinessAccountId, creationId);
}

// ─── FUNCIONES AUXILIARES ─────────────────────────────────────────────────

/**
 * Publica un media container (carousel o reel) en Instagram.
 */
async function publishMediaContainer(
  accessToken: string,
  instagramBusinessAccountId: string,
  creationId: string
): Promise<InstagramPublishResult> {
  const publishBody = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });

  const publishRes = await fetch(
    `${GRAPH_API_URL}/${instagramBusinessAccountId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: publishBody.toString(),
    }
  );

  if (!publishRes.ok) {
    const errorText = await publishRes.text();
    throw new Error(`Error al publicar en Instagram: ${errorText}`);
  }

  const publishData = (await publishRes.json()) as { id: string };

  // Obtener el permalink
  let permalink: string | undefined;
  try {
    const mediaRes = await fetch(
      `${GRAPH_API_URL}/${publishData.id}?fields=permalink&access_token=${accessToken}`
    );
    if (mediaRes.ok) {
      const mediaData = (await mediaRes.json()) as { permalink?: string };
      if (mediaData.permalink) {
        permalink = mediaData.permalink;
      }
    }
  } catch {
    // El permalink es opcional, no bloquear si falla
  }

  return {
    postId: publishData.id,
    permalink,
  };
}

/**
 * Hace polling al estado de un media container hasta que esté FINISHED o
 * lance error. Para carruseles revisa cada child también.
 */
async function pollMediaContainerStatus(
  accessToken: string,
  creationId: string,
  maxSeconds: number = 15
): Promise<void> {
  let attempts = 0;
  const maxAttempts = maxSeconds * 2; // cada 2s
  let finished = false;

  while (attempts < maxAttempts && !finished) {
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const statusRes = await fetch(
        `${GRAPH_API_URL}/${creationId}?fields=status_code,error_message,id&access_token=${accessToken}`
      );

      if (statusRes.ok) {
        const statusData = (await statusRes.json()) as {
          status_code: string;
          error_message?: string;
        };

        if (statusData.status_code === "FINISHED") {
          finished = true;
        } else if (statusData.status_code === "ERROR") {
          throw new Error(
            `El procesamiento del media en Instagram falló: ${statusData.error_message || "Error desconocido"}`
          );
        }
      }
    } catch (err: any) {
      if (err.message?.includes("procesamiento del media")) {
        throw err;
      }
      console.warn(`Intento ${attempts} de consultar estado del container falló.`, err);
    }
  }

  if (!finished) {
    throw new Error(`Tiempo de espera agotado: Instagram tardó demasiado en procesar el media (creation_id: ${creationId}).`);
  }
}
