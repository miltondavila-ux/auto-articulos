export const GOOGLE_STATE_COOKIE = "google_search_console_oauth_state";
export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/webmasters";

export function googleOAuthConfig() {
  const clientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_SEARCH_CONSOLE_REDIRECT_URI ??
    "https://auto-articulos-web.vercel.app/api/search-integrations/google/callback";
  if (!clientId || !clientSecret)
    throw new Error("Google OAuth no está configurado.");
  return { clientId, clientSecret, redirectUri };
}
