const TOKEN_URL = "https://oauth2.googleapis.com/token";
const WEBMASTERS_API = "https://www.googleapis.com/webmasters/v3";

function googleConfig() {
  const clientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google Search Console OAuth no está configurado.");
  }
  return { clientId, clientSecret };
}

export async function getGoogleAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = googleConfig();
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
    throw new Error(data.error_description ?? "Google rechazó el token OAuth.");
  }
  return data.access_token;
}

export async function listGoogleSearchConsoleSites(accessToken: string) {
  const response = await fetch(`${WEBMASTERS_API}/sites`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await response.json()) as {
    siteEntry?: Array<{ siteUrl: string; permissionLevel: string }>;
    error?: { message?: string };
  };
  if (!response.ok)
    throw new Error(
      data.error?.message ?? "No se pudieron listar las propiedades.",
    );
  return data.siteEntry ?? [];
}

export async function submitGoogleSitemap(
  accessToken: string,
  siteUrl: string,
  sitemapUrl: string,
) {
  const response = await fetch(
    `${WEBMASTERS_API}/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
    { method: "PUT", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(
      data.error?.message ?? `Google respondió ${response.status}.`,
    );
  }
}
