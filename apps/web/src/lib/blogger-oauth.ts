import { BLOGGER_SCOPE } from "@auto-articulos/shared";

export const BLOGGER_STATE_COOKIE = "blogger_oauth_state";

export function bloggerOAuthConfig() {
  const clientId = process.env.BLOGGER_CLIENT_ID;
  const clientSecret = process.env.BLOGGER_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth no está configurado.");
  return { clientId, clientSecret, scope: BLOGGER_SCOPE };
}
