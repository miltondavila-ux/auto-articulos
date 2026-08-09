/**
 * Módulo de integración con Meta Threads API v1.0
 * Documentación oficial: https://developers.facebook.com/docs/threads
 */

export interface ThreadsTokenExchangeResult {
  longLivedToken: string;
  expiresInSeconds: number;
  threadsUserId: string;
  threadsUsername: string;
}

export interface ThreadsPublishResult {
  postId: string;
  permalink?: string;
}

/**
 * Obtiene las credenciales de la aplicación Threads de Meta (App ID y App Secret).
 */
export function getThreadsAppCredentials(overrideId?: string, overrideSecret?: string) {
  const appId = overrideId || process.env.THREADS_APP_ID;
  const appSecret = overrideSecret || process.env.THREADS_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error(
      "La App ID y App Secret de Meta Threads no han sido configuradas todavía."
    );
  }

  return { appId, appSecret };
}

/**
 * Genera la URL de autorización de OAuth 2.0 para Meta Threads.
 */
export function getThreadsAuthUrl(
  state: string,
  redirectUri: string,
  appCredentials?: { appId: string; appSecret: string }
): string {
  const { appId } = appCredentials || getThreadsAppCredentials();
  const scope = "threads_basic,threads_content_publish";
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: scope,
    response_type: "code",
    state: state,
  });

  return `https://threads.net/oauth/authorize?${params.toString()}`;
}

/**
 * Canjea el código de autorización de Meta Threads por un Short-Lived Token,
 * luego por un Long-Lived Token (60 días) y obtiene el perfil del usuario.
 */
export async function exchangeCodeForThreadsTokens(
  code: string,
  redirectUri: string,
  appCredentials?: { appId: string; appSecret: string }
): Promise<ThreadsTokenExchangeResult> {
  const { appId, appSecret } = appCredentials || getThreadsAppCredentials();

  // Paso 1: Canjear code por Short-Lived Access Token
  const shortLivedBody = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code: code,
  });

  const shortLivedRes = await fetch("https://graph.threads.net/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: shortLivedBody.toString(),
  });

  if (!shortLivedRes.ok) {
    const errorText = await shortLivedRes.text();
    throw new Error(`Error al obtener Short-Lived Token de Threads: ${errorText}`);
  }

  const shortLivedData = (await shortLivedRes.json()) as {
    access_token: string;
    user_id: number | string;
  };

  const shortLivedToken = shortLivedData.access_token;

  // Paso 2: Canjear Short-Lived Token por Long-Lived Token (60 días)
  const longLivedParams = new URLSearchParams({
    grant_type: "th_exchange_token",
    client_secret: appSecret,
    access_token: shortLivedToken,
  });

  const longLivedRes = await fetch(
    `https://graph.threads.net/access_token?${longLivedParams.toString()}`,
    { method: "GET" }
  );

  if (!longLivedRes.ok) {
    const errorText = await longLivedRes.text();
    throw new Error(`Error al canjear Long-Lived Token de Threads: ${errorText}`);
  }

  const longLivedData = (await longLivedRes.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
  };

  const longLivedToken = longLivedData.access_token;
  const expiresInSeconds = longLivedData.expires_in || 60 * 86400; // 60 días por defecto

  // Paso 3: Obtener perfil del usuario (@username y user_id de Threads)
  const profileRes = await fetch(
    `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${longLivedToken}`
  );

  let threadsUserId = String(shortLivedData.user_id);
  let threadsUsername = "";

  if (profileRes.ok) {
    const profileData = (await profileRes.json()) as { id: string; username?: string };
    if (profileData.id) threadsUserId = profileData.id;
    if (profileData.username) threadsUsername = profileData.username;
  }

  return {
    longLivedToken,
    expiresInSeconds,
    threadsUserId,
    threadsUsername,
  };
}

/**
 * Renueva un Long-Lived Token antes de que expire (debe ejecutarse dentro de los 60 días).
 */
export async function refreshThreadsToken(
  accessToken: string
): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const params = new URLSearchParams({
    grant_type: "th_refresh_token",
    access_token: accessToken,
  });

  const res = await fetch(
    `https://graph.threads.net/refresh_access_token?${params.toString()}`,
    { method: "GET" }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al refrescar token de Threads: ${errorText}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  return {
    accessToken: data.access_token,
    expiresInSeconds: data.expires_in,
  };
}

/**
 * Publica un Hilo en Meta Threads en 2 Pasos (Container API).
 * Soporta texto de hasta 500 caracteres e imagen opcional.
 */
export async function publishThread(
  accessToken: string,
  threadsUserId: string,
  text: string,
  imageUrl?: string
): Promise<ThreadsPublishResult> {
  // Truncar texto a 500 caracteres con puntos suspensivos si excede el límite de Threads
  const maxChars = 500;
  const safeText = text.length > maxChars ? text.substring(0, maxChars - 3) + "..." : text;

  // Paso 1: Crear Contenedor del Hilo
  const containerParams: Record<string, string> = {
    media_type: imageUrl ? "IMAGE" : "TEXT",
    text: safeText,
    access_token: accessToken,
  };

  if (imageUrl) {
    containerParams.image_url = imageUrl;
  }

  const containerBody = new URLSearchParams(containerParams);

  const containerRes = await fetch(
    `https://graph.threads.net/v1.0/${threadsUserId}/threads`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: containerBody.toString(),
    }
  );

  if (!containerRes.ok) {
    const errorText = await containerRes.text();
    throw new Error(`Error al crear contenedor en Meta Threads: ${errorText}`);
  }

  const containerData = (await containerRes.json()) as { id: string };
  const creationId = containerData.id;

  if (!creationId) {
    throw new Error("Meta Threads no devolvió un creation_id válido.");
  }

  // Paso 2: Polling del estado del contenedor (especialmente si lleva imagen)
  if (imageUrl) {
    let attempts = 0;
    const maxAttempts = 15; // 30 segundos máximo
    let finished = false;

    while (attempts < maxAttempts && !finished) {
      attempts++;
      // Esperar 2 segundos antes de volver a verificar
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        const statusRes = await fetch(
          `https://graph.threads.net/v1.0/${creationId}?fields=status_code,error_message&access_token=${accessToken}`
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
              `El procesamiento de la imagen en Threads falló: ${statusData.error_message || "Error desconocido"}`
            );
          }
        }
      } catch (err: any) {
        // Si hay error en la consulta y es por rechazo de imagen, lanzarlo
        if (err.message && err.message.includes("procesamiento de la imagen")) {
          throw err;
        }
        console.warn(`Intento ${attempts} de consultar estado del contenedor falló. Reintentando...`, err);
      }
    }

    if (!finished) {
      throw new Error("Tiempo de espera agotado: Meta Threads tardó demasiado en procesar la imagen.");
    }
  } else {
    // Si es solo texto, una pausa básica de seguridad de 500ms
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Paso 3: Publicar el Contenedor
  const publishBody = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });

  const publishRes = await fetch(
    `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: publishBody.toString(),
    }
  );

  if (!publishRes.ok) {
    const errorText = await publishRes.text();
    throw new Error(`Error al publicar el Hilo en Meta Threads: ${errorText}`);
  }

  const publishData = (await publishRes.json()) as { id: string };

  let permalink: string | undefined;
  try {
    const permalinkRes = await fetch(
      `https://graph.threads.net/v1.0/${publishData.id}?fields=permalink&access_token=${accessToken}`
    );
    if (permalinkRes.ok) {
      const permalinkData = (await permalinkRes.json()) as { permalink: string };
      if (permalinkData.permalink) {
        permalink = permalinkData.permalink;
      }
    }
  } catch (err) {
    console.error("Error al obtener el permalink de Threads:", err);
  }

  return {
    postId: publishData.id,
    permalink,
  };
}
