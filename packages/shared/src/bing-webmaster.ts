const TOKEN_URL = "https://www.bing.com/webmasters/oauth/token";
const API_BASE = "https://ssl.bing.com/webmaster/api.svc/json";

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
  const data = (await response.json()) as {
    access_token?: string;
    error_description?: string;
  };
  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ?? "Bing Webmaster Tools rechazó el token OAuth.",
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

export async function submitBingSitemap(
  accessToken: string,
  siteUrl: string,
  feedUrl: string,
) {
  const response = await fetch(`${API_BASE}/SubmitFeed`, {
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
  const response = await fetch(`${API_BASE}/SubmitUrl`, {
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
