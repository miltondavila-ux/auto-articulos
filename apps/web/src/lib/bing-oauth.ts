export const BING_STATE_COOKIE = "bing_webmaster_oauth_state";
export const BING_SCOPE = "webmaster.manage";

export function bingOAuthConfig() {
  const clientId = process.env.BING_WEBMASTER_CLIENT_ID;
  const clientSecret = process.env.BING_WEBMASTER_CLIENT_SECRET;
  const redirectUri =
    process.env.BING_WEBMASTER_REDIRECT_URI ??
    "https://auto-articulos-web.vercel.app/api/search-integrations/bing/callback";
  if (!clientId || !clientSecret)
    throw new Error("Bing Webmaster Tools OAuth no está configurado.");
  return { clientId, clientSecret, redirectUri };
}
