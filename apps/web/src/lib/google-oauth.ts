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

// Google Business Profile usa el MISMO proyecto/cliente OAuth de Google
// Cloud que Search Console (un solo cliente puede pedir varios scopes de
// varias APIs) — pedido explícito del usuario, 5/8/2026: cada usuario debe
// poder conectar la misma cuenta de Google que ya usa para Search Console, o
// una distinta, exactamente igual que ese flujo.
export const BUSINESS_PROFILE_STATE_COOKIE = "google_business_profile_oauth_state";
export const BUSINESS_PROFILE_SCOPE = "https://www.googleapis.com/auth/business.manage";

export function businessProfileOAuthConfig() {
  const clientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_BUSINESS_PROFILE_REDIRECT_URI ??
    "https://auto-articulos-web.vercel.app/api/business-profile/callback";
  if (!clientId || !clientSecret)
    throw new Error("Google OAuth no está configurado.");
  return { clientId, clientSecret, redirectUri };
}
