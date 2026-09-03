export const GOOGLE_ANALYTICS_STATE_COOKIE = "google_analytics_oauth_state";
export const GOOGLE_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

export function googleAnalyticsOAuthConfig() {
  const clientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_ANALYTICS_REDIRECT_URI ??
    "https://seototal.lasolucionweb.com/api/google-analytics/callback";
  if (!clientId || !clientSecret) throw new Error("Google OAuth no está configurado.");
  return { clientId, clientSecret, redirectUri };
}
