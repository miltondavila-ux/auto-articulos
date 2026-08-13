const TOKEN_URL = "https://www.bing.com/webmasters/oauth/token";
const API_BASE = "https://ssl.bing.com/webmaster/api.svc/json";
// Bug real encontrado el 12/8/2026 (cuenta de Julio Paso): SubmitUrl fallaba
// siempre con "ERROR!!! InvalidToken", con el mismo access token que
// funcionaba bien un instante antes para listar sitios. La documentación
// oficial de Microsoft (learn.microsoft.com/en-us/bingwebmaster/oauth2,
// actualizada 7/8/2026) muestra el endpoint de SubmitUrl como
// www.bing.com/webmaster/api.svc/json/SubmitUrl — no ssl.bing.com. Se separa
// la base para las operaciones de ESCRITURA (SubmitUrl, SubmitFeed, mismo
// patrón), sin tocar listBingSites (lectura), que sí funciona hoy en
// ssl.bing.com — no arriesgar algo que ya funciona sin evidencia de que
// también esté roto.
const API_BASE_WRITE = "https://www.bing.com/webmaster/api.svc/json";

function bingConfig() {
  const clientId = process.env.BING_WEBMASTER_CLIENT_ID;
  const clientSecret = process.env.BING_WEBMASTER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Bing Webmaster Tools OAuth no está configurado.");
  }
  return { clientId, clientSecret };
}

export async function getBingAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = bingConfig();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !data.access_token) {
    // Bug real encontrado el 13/8/2026 (cuenta de Lorena Álvarez): cuando la
    // conexión guardada deja de servir, Bing responde SIEMPRE
    // {"error":"invalid_client","error_description":"Client authentication
    // failed."} — verificado a mano contra el endpoint real: devuelve ese
    // mismo texto con credenciales de cliente VÁLIDAS y un refresh token
    // inválido. O sea que "Client authentication failed" no habla del cliente,
    // habla de la conexión del usuario, y es el mismo caso que el viejo
    // "Refresh token is invalid or expired": hay que volver a autorizar.
    // Ese texto crudo en inglés no le decía nada al usuario ni coincidía con
    // la detección de "token vencido" de la UI, así que la pantalla quedaba
    // sin el botón "Reconectar Bing" — un callejón sin salida.
    const detalle = data.error_description ?? data.error ?? `HTTP ${response.status}`;
    throw new Error(
      `La conexión con Bing venció o fue revocada: hay que volver a autorizar la cuenta. (Bing respondió: ${detalle})`,
    );
  }
  return data.access_token;
}

export interface BingSite {
  Url: string;
  IsVerified: boolean;
}

export async function listBingSites(accessToken: string): Promise<BingSite[]> {
  const response = await fetch(`${API_BASE}/GetUserSites`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await response.json().catch(() => ({}))) as {
    d?: BingSite[];
    ErrorCode?: number;
    Message?: string;
  };
  if (!response.ok) {
    throw new Error(
      data.Message ?? "No se pudieron listar los sitios de Bing Webmaster Tools.",
    );
  }
  return (data.d ?? []).filter((site) => site.IsVerified);
}

/**
 * Pedido explícito del usuario (11/8/2026): Google ya detecta y precarga el
 * sitemap automáticamente cuando el usuario elige su propiedad (ver
 * listGoogleSitemaps en google-search-console.ts); Bing no tenía el mismo
 * comportamiento y obligaba a escribirlo siempre a mano. Mismo patrón
 * defensivo: si esto falla (nombre real del endpoint no confirmado contra
 * una cuenta real todavía), no bloquea nada — el campo sigue editable a mano
 * como respaldo, igual que ya pasa con Google.
 */
export async function listBingSitemaps(
  accessToken: string,
  siteUrl: string,
): Promise<string[]> {
  const response = await fetch(
    `${API_BASE}/GetSitemaps?siteUrl=${encodeURIComponent(siteUrl)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data = (await response.json().catch(() => ({}))) as {
    d?: Array<{ Url?: string }>;
    Message?: string;
  };
  if (!response.ok) {
    throw new Error(
      data.Message ?? "No se pudieron listar los sitemaps de Bing Webmaster Tools.",
    );
  }
  return (data.d ?? [])
    .map((s) => s.Url)
    .filter((url): url is string => Boolean(url));
}

export async function submitBingSitemap(
  accessToken: string,
  siteUrl: string,
  feedUrl: string,
) {
  const response = await fetch(`${API_BASE_WRITE}/SubmitFeed`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ siteUrl, feedUrl }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      Message?: string;
    };
    throw new Error(
      data.Message ?? `Bing Webmaster Tools respondió ${response.status}.`,
    );
  }
}

/**
 * Pide indexación instantánea de UNA url — a diferencia de Google (cuya
 * Indexing API solo aplica a ofertas de empleo/transmisiones en vivo), Bing
 * sí permite esto para cualquier contenido. Cupo real: 10,000 URLs/día por
 * dominio (ver https://www.bing.com/webmasters/url-submission-api).
 */
export async function submitBingUrl(
  accessToken: string,
  siteUrl: string,
  url: string,
) {
  const response = await fetch(`${API_BASE_WRITE}/SubmitUrl`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ siteUrl, url }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      Message?: string;
    };
    throw new Error(
      data.Message ?? `Bing Webmaster Tools respondió ${response.status}.`,
    );
  }
}
