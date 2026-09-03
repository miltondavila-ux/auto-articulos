const BLOGGER_API = "https://www.googleapis.com/blogger/v3";

export const BLOGGER_SCOPE = "https://www.googleapis.com/auth/blogger";

export function getBloggerAuthUrl(state: string, redirectUri: string, clientId: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: BLOGGER_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  }).toString();
  return url.toString();
}

export async function exchangeCodeForBloggerTokens(code: string, redirectUri: string, clientId: string, clientSecret: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, grant_type: "authorization_code", redirect_uri: redirectUri }),
  });
  if (!response.ok) throw new Error(`Blogger OAuth falló: ${await response.text()}`);
  return response.json() as Promise<{ access_token: string; refresh_token?: string; expires_in?: number }>;
}

export async function refreshBloggerToken(refreshToken: string, clientId: string, clientSecret: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  if (!response.ok) throw new Error(`Blogger no pudo renovar la autorización: ${await response.text()}`);
  return response.json() as Promise<{ access_token: string; expires_in?: number }>;
}

export async function getBloggerBlogs(accessToken: string) {
  const response = await fetch(`${BLOGGER_API}/users/self/blogs`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`No se pudieron obtener los blogs de Blogger: ${await response.text()}`);
  const json = await response.json() as { items?: Array<{ id: string; name?: string; description?: string; url?: string }> };
  return (json.items ?? []).map((blog) => ({ id: blog.id, name: blog.name || blog.id, url: blog.url || null }));
}

export async function createBloggerPost(accessToken: string, blogId: string, payload: { title: string; content: string; isDraft?: boolean }) {
  const url = new URL(`${BLOGGER_API}/blogs/${encodeURIComponent(blogId)}/posts`);
  if (payload.isDraft) url.searchParams.set("isDraft", "true");
  const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ kind: "blogger#post", blog: { id: blogId }, title: payload.title, content: payload.content }) });
  if (!response.ok) throw new Error(`No se pudo crear la entrada de Blogger: ${await response.text()}`);
  return response.json() as Promise<{ id: string; url?: string; title?: string }>;
}

export async function publishBloggerPost(accessToken: string, blogId: string, postId: string) {
  const response = await fetch(`${BLOGGER_API}/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(postId)}/publish`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`No se pudo publicar la entrada de Blogger: ${await response.text()}`);
  return response.json() as Promise<{ id: string; url?: string }>;
}
