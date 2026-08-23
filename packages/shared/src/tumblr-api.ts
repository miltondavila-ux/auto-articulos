const TUMBLR_API = "https://api.tumblr.com/v2";

export interface TumblrAppCredentials {
  clientId: string;
  clientSecret: string;
}

export function getTumblrAuthUrl(
  state: string,
  redirectUri: string,
  credentials: TumblrAppCredentials,
): string {
  const url = new URL("https://www.tumblr.com/oauth2/authorize");
  url.searchParams.set("client_id", credentials.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "basic write offline_access");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", redirectUri);
  return url.toString();
}

export async function exchangeCodeForTumblrToken(
  code: string,
  redirectUri: string,
  credentials: TumblrAppCredentials,
) {
  const response = await fetch(`${TUMBLR_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      redirect_uri: redirectUri,
    }),
  });
  if (!response.ok) throw new Error(`Tumblr OAuth falló: ${await response.text()}`);
  return response.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  }>;
}

export async function getTumblrBlogs(accessToken: string) {
  const response = await fetch(`${TUMBLR_API}/user/info`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`No se pudieron obtener los blogs de Tumblr: ${await response.text()}`);
  const json = await response.json() as { response?: { user?: { blogs?: Array<{ name: string; title?: string; url?: string }> } } };
  return (json.response?.user?.blogs ?? []).map((blog) => ({
    identifier: blog.name,
    title: blog.title || blog.name,
    url: blog.url || null,
  }));
}

export async function createTumblrPhotoPost(
  accessToken: string,
  blogIdentifier: string,
  payload: { caption: string; link: string; imageUrl: string },
) {
  const response = await fetch(`${TUMBLR_API}/blog/${encodeURIComponent(blogIdentifier)}/post`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      type: "photo",
      state: "published",
      source: payload.imageUrl,
      caption: `${payload.caption}\n\n<a href="${payload.link}">Leer el artículo completo</a>`,
      link: payload.link,
    }),
  });
  if (!response.ok) throw new Error(`No se pudo crear el post de Tumblr: ${await response.text()}`);
  return response.json() as Promise<{ response?: { id?: string | number; post_url?: string } }>;
}
