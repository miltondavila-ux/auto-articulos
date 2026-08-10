/**
 * Módulo de integración con X (Twitter) API v2
 * Documentación oficial: https://developer.x.com/en/docs
 */

export interface TwitterTokenExchangeResult {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  twitterUserId: string;
  twitterUsername: string;
}

export interface TwitterPublishResult {
  tweetId: string;
  tweetUrl?: string;
}

/**
 * Obtiene las credenciales de la aplicación X (Client ID y Client Secret).
 */
export function getTwitterAppCredentials(overrideId?: string, overrideSecret?: string) {
  const clientId = overrideId || process.env.TWITTER_CLIENT_ID;
  const clientSecret = overrideSecret || process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "El Client ID y Client Secret de X (Twitter) no han sido configurados todavía."
    );
  }

  return { clientId, clientSecret };
}

/**
 * Genera la URL de autorización de OAuth 2.0 PKCE para X (Twitter).
 */
export function getTwitterAuthUrl(
  state: string,
  codeChallenge: string,
  redirectUri: string,
  appCredentials?: { clientId: string; clientSecret: string }
): string {
  const { clientId } = appCredentials || getTwitterAppCredentials();
  const scope = "tweet.read tweet.write users.read offline.access";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scope,
    response_type: "code",
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

/**
 * Canjea el código de autorización de X por un Access Token y Refresh Token.
 */
export async function exchangeCodeForTwitterTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  appCredentials?: { clientId: string; clientSecret: string }
): Promise<TwitterTokenExchangeResult> {
  const { clientId, clientSecret } = appCredentials || getTwitterAppCredentials();

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code: code,
    code_verifier: codeVerifier,
  });

  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al obtener tokens de X (Twitter): ${errorText}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };

  // Obtener perfil del usuario
  const profileRes = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });

  let twitterUserId = "";
  let twitterUsername = "";

  if (profileRes.ok) {
    const profileData = (await profileRes.json()) as {
      data?: { id: string; username: string };
    };
    if (profileData.data) {
      twitterUserId = profileData.data.id;
      twitterUsername = profileData.data.username;
    }
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresInSeconds: data.expires_in,
    twitterUserId,
    twitterUsername,
  };
}

/**
 * Renueva un Access Token usando el Refresh Token.
 */
export async function refreshTwitterToken(
  refreshToken: string,
  appCredentials?: { clientId: string; clientSecret: string }
): Promise<{ accessToken: string; refreshToken: string; expiresInSeconds: number }> {
  const { clientId, clientSecret } = appCredentials || getTwitterAppCredentials();

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al refrescar token de X (Twitter): ${errorText}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresInSeconds: data.expires_in,
  };
}

/**
 * Publica un tweet en X (Twitter).
 * Soporta texto de hasta 280 caracteres.
 */
export async function publishTweet(
  accessToken: string,
  text: string,
  imageUrl?: string
): Promise<TwitterPublishResult> {
  // Truncar texto a 280 caracteres con puntos suspensivos si excede el límite
  const maxChars = 280;
  const safeText = text.length > maxChars ? text.substring(0, maxChars - 3) + "..." : text;

  // Si hay imagen, subirla primero y obtener el media_id
  let mediaId: string | undefined;
  if (imageUrl) {
    const uploaded = await uploadMedia(accessToken, imageUrl);
    if (uploaded) mediaId = uploaded;
  }

  const tweetBody: Record<string, unknown> = { text: safeText };

  if (mediaId) {
    tweetBody.media = { media_ids: [mediaId] };
  }

  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(tweetBody),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al publicar tweet en X: ${errorText}`);
  }

  const data = (await res.json()) as { data?: { id: string } };
  const tweetId = data.data?.id;

  if (!tweetId) {
    throw new Error("X (Twitter) no devolvió un tweet_id válido.");
  }

  const tweetUrl = `https://x.com/i/status/${tweetId}`;

  return { tweetId, tweetUrl };
}

/**
 * Sube una imagen a Twitter para usarla en un tweet.
 * Twitter requiere un flujo de upload de 2 pasos para imágenes.
 */
async function uploadMedia(accessToken: string, imageUrl: string): Promise<string | null> {
  try {
    // Paso 1: Descargar la imagen
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      console.warn("No se pudo descargar la imagen para Twitter:", imageUrl);
      return null;
    }
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    // Paso 2: INIT - Iniciar la subida
    const initParams = new URLSearchParams({
      command: "INIT",
      total_bytes: String(imageBuffer.length),
      media_type: "image/png",
    });

    const initRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: initParams,
    });

    if (!initRes.ok) {
      console.warn("Error al iniciar subida de imagen a Twitter:", await initRes.text());
      return null;
    }

    const initData = (await initRes.json()) as { media_id_string: string };
    const mediaId = initData.media_id_string;

    // Paso 3: APPEND - Enviar los datos de la imagen
    const formData = new FormData();
    formData.append("command", "APPEND");
    formData.append("media_id", mediaId);
    formData.append("segment_index", "0");

    const blob = new Blob([imageBuffer], { type: "image/png" });
    formData.append("media_data", blob);

    const appendRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });

    if (!appendRes.ok) {
      console.warn("Error al enviar imagen a Twitter:", await appendRes.text());
      return null;
    }

    // Paso 4: FINALIZE - Finalizar la subida
    const finalizeParams = new URLSearchParams({
      command: "FINALIZE",
      media_id: mediaId,
    });

    const finalizeRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: finalizeParams,
    });

    if (!finalizeRes.ok) {
      console.warn("Error al finalizar subida de imagen a Twitter:", await finalizeRes.text());
      return null;
    }

    return mediaId;
  } catch (err) {
    console.error("Error al subir imagen a Twitter:", err);
    return null;
  }
}
