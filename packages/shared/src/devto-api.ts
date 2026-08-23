const DEVTO_API = "https://dev.to/api";

export type DevToArticle = { url?: string; path?: string; user?: { username?: string } };

async function devToRequest<T>(path: string, apiKey: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${DEVTO_API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "api-key": apiKey, ...(init.headers || {}) },
  });
  if (!response.ok) throw new Error(`DEV.to API falló (${response.status}): ${await response.text()}`);
  return response.json() as Promise<T>;
}

export async function verifyDevToApiKey(apiKey: string) {
  return devToRequest<DevToArticle[]>("/articles/me?per_page=1", apiKey, { method: "GET" });
}

export async function createDevToArticle(apiKey: string, article: {
  title: string;
  bodyMarkdown: string;
  canonicalUrl: string;
  description?: string | null;
  mainImage?: string | null;
  tags?: string[];
}) {
  return devToRequest<DevToArticle>("/articles", apiKey, {
    method: "POST",
    body: JSON.stringify({ article: {
      title: article.title,
      body_markdown: article.bodyMarkdown,
      published: true,
      canonical_url: article.canonicalUrl,
      description: article.description || undefined,
      main_image: article.mainImage || undefined,
      tags: (article.tags || []).slice(0, 4),
    } }),
  });
}

export function getDevToArticleUrl(article: DevToArticle) {
  return article.url || (article.user?.username && article.path ? `https://dev.to${article.path}` : null);
}
