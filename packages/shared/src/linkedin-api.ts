/**
 * Módulo de integración con LinkedIn API
 * Documentación oficial: https://learn.microsoft.com/en-us/linkedin/
 * Share on LinkedIn (gratuito): https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
 */

export interface LinkedInTokenExchangeResult {
  accessToken: string;
  expiresIn: number;
  linkedinUserId: string;
  linkedinUsername: string;
}

export interface LinkedInPublishResult {
  postId: string;
  postUrl: string;
}

/**
 * Obtiene las credenciales de la aplicación LinkedIn (Client ID y Client Secret).
 */
export function getLinkedInAppCredentials(overrideId?: string, overrideSecret?: string) {
  const clientId = overrideId || process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = overrideSecret || process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "El Client ID y Client Secret de LinkedIn no han sido configurados todavía."
    );
  }

  return { clientId, clientSecret };
}

/**
 * Genera la URL de autorización de OAuth 2.0 para LinkedIn.
 */
export function getLinkedInAuthUrl(
  state: string,
  redirectUri: string,
  appCredentials?: { clientId: string; clientSecret: string }
): string {
  const { clientId } = appCredentials || getLinkedInAppCredentials();
  // openid + profile: requeridos para leer /v2/userinfo (obtener el ID del
  // usuario que necesitamos para publicar). w_member_social: publicar posts.
  // El developer debe tener agregados ambos productos en su app de LinkedIn:
  // "Sign In with LinkedIn using OpenID Connect" y "Share on LinkedIn".
  const scope = "openid profile w_member_social";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scope,
    state: state,
  });

  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

/**
 * Canjea el código de autorización de LinkedIn por un Access Token.
 */
export async function exchangeCodeForLinkedInTokens(
  code: string,
  redirectUri: string,
  appCredentials?: { clientId: string; clientSecret: string }
): Promise<LinkedInTokenExchangeResult> {
  const { clientId, clientSecret } = appCredentials || getLinkedInAppCredentials();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al obtener Access Token de LinkedIn: ${errorText}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  const accessToken = data.access_token;
  const expiresIn = data.expires_in;

  // Obtener perfil del usuario
  const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let linkedinUserId = "";
  let linkedinUsername = "";

  if (profileRes.ok) {
    const profileData = (await profileRes.json()) as {
      sub: string;
      name?: string;
      email?: string;
    };
    linkedinUserId = profileData.sub;
    linkedinUsername = profileData.name || profileData.email || linkedinUserId;
  }

  return {
    accessToken,
    expiresIn,
    linkedinUserId,
    linkedinUsername,
  };
}

/**
 * Renueva un Access Token de LinkedIn (LinkedIn no tiene refresh token explícito,
 * pero el access token dura 60 días y se puede renovar con el mismo flujo).
 */
export async function refreshLinkedInToken(
  refreshToken: string,
  appCredentials?: { clientId: string; clientSecret: string }
): Promise<{ accessToken: string; expiresIn: number }> {
  const { clientId, clientSecret } = appCredentials || getLinkedInAppCredentials();

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al refrescar token de LinkedIn: ${errorText}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Registra y sube una imagen a LinkedIn (flujo nativo de 2 pasos) para
 * adjuntarla a un post. Devuelve el asset URN (ej. "urn:li:digitalmediaAsset:C5...")
 * o null si algo falla (en cuyo caso el post se publica solo con texto).
 *
 * Nota: LinkedIn no permite combinar una imagen nativa con la vista previa
 * de "ARTICLE" (link con miniatura automática) en el mismo post — son
 * shareMediaCategory distintos. Por eso, cuando hay imagen, el enlace del
 * artículo se incluye como texto plano dentro del comentario en vez de como
 * adjunto ARTICLE.
 */
export async function uploadLinkedInImage(
  accessToken: string,
  linkedinUserId: string,
  imageUrl: string
): Promise<string | null> {
  try {
    // Paso 1: registrar la subida
    const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: `urn:li:person:${linkedinUserId}`,
          serviceRelationships: [
            { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
          ],
        },
      }),
    });

    if (!registerRes.ok) {
      console.warn("Error al registrar subida de imagen en LinkedIn:", await registerRes.text());
      return null;
    }

    const registerData = (await registerRes.json()) as {
      value: {
        uploadMechanism: {
          "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": { uploadUrl: string };
        };
        asset: string;
      };
    };

    const uploadUrl =
      registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]
        .uploadUrl;
    const asset = registerData.value.asset;

    // Paso 2: descargar la imagen generada y subir los bytes a LinkedIn
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      console.warn("No se pudo descargar la imagen para subir a LinkedIn:", imageUrl);
      return null;
    }
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream",
      },
      body: imageBuffer,
    });

    if (!uploadRes.ok) {
      console.warn("Error al subir los bytes de la imagen a LinkedIn:", await uploadRes.text());
      return null;
    }

    return asset;
  } catch (err) {
    console.error("Error al subir imagen a LinkedIn:", err);
    return null;
  }
}

/**
 * Publica un post en LinkedIn.
 * Soporta texto de hasta 3000 caracteres, opcionalmente con una imagen
 * nativa (imageAssetUrn, obtenido de uploadLinkedInImage) o con vista
 * previa de artículo (articleUrl, solo si no hay imagen).
 */
export async function publishLinkedInPost(
  accessToken: string,
  linkedinUserId: string,
  text: string,
  articleUrl?: string,
  imageAssetUrn?: string,
  title?: string
): Promise<LinkedInPublishResult> {
  // Truncar texto a 3000 caracteres con puntos suspensivos si excede el límite
  const maxChars = 3000;
  const safeText = text.length > maxChars ? text.substring(0, maxChars - 3) + "..." : text;

  // Construir el body del post
  const postBody: Record<string, unknown> = {
    author: `urn:li:person:${linkedinUserId}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: safeText,
        },
        shareMediaCategory: imageAssetUrn ? "IMAGE" : articleUrl ? "ARTICLE" : "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  // Prioridad: imagen nativa (no se puede combinar con vista previa ARTICLE).
  // El enlace del artículo ya viene incluido como texto plano en `text`.
  if (imageAssetUrn) {
    (postBody.specificContent as any)["com.linkedin.ugc.ShareContent"].media = [
      {
        status: "READY",
        media: imageAssetUrn,
      },
    ];
  } else if (articleUrl) {
    (postBody.specificContent as any)["com.linkedin.ugc.ShareContent"].media = [
      {
        status: "READY",
        originalUrl: articleUrl,
        title: {
          text: title || "Artículo",
        },
      },
    ];
  }

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(postBody),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al publicar en LinkedIn: ${errorText}`);
  }

  // LinkedIn devuelve el ID del post en el header X-RestLi-Id
  const postId = res.headers.get("X-RestLi-Id") || "";

  // Construir URL del post
  const postUrl = postId
    ? `https://www.linkedin.com/feed/update/${postId}`
    : `https://www.linkedin.com/feed/`;

  return { postId, postUrl };
}
