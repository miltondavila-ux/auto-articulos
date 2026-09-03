const PINTEREST_API = "https://api.pinterest.com/v5";

export interface PinterestAppCredentials {
  clientId: string;
  clientSecret: string;
}

export function getPinterestAuthUrl(
  state: string,
  redirectUri: string,
  credentials: PinterestAppCredentials,
): string {
  const url = new URL("https://www.pinterest.com/oauth/");
  url.searchParams.set("client_id", credentials.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "boards:read,boards:write,pins:read,pins:write");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForPinterestToken(
  code: string,
  redirectUri: string,
  credentials: PinterestAppCredentials,
) {
  const basic = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64");
  const response = await fetch(`${PINTEREST_API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      continuous_refresh: "true",
    }),
  });
  if (!response.ok) throw new Error(`Pinterest OAuth falló: ${await response.text()}`);
  return response.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_token_expires_at?: number;
  }>;
}

export async function listPinterestBoards(accessToken: string) {
  const response = await fetch(`${PINTEREST_API}/boards?page_size=100`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`No se pudieron obtener los tableros de Pinterest: ${await response.text()}`);
  return response.json() as Promise<{ items: Array<{ id: string; name: string; privacy?: string }>; bookmark?: string }>;
}

export async function createPinterestPin(
  accessToken: string,
  payload: { boardId: string; title: string; description: string; link: string; imageUrl: string },
) {
  const response = await fetch(`${PINTEREST_API}/pins`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      board_id: payload.boardId,
      title: payload.title.slice(0, 100),
      // Límite oficial de descripción de Pin: 500 caracteres (era 800).
      description: payload.description.slice(0, 500),
      link: payload.link,
      media_source: { source_type: "image_url", url: payload.imageUrl },
    }),
  });
  if (!response.ok) throw new Error(`No se pudo crear el Pin: ${await response.text()}`);
  return response.json() as Promise<{ id: string; link?: string }>;
}
