const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ADMIN_API = "https://analyticsadmin.googleapis.com/v1beta";
const DATA_API = "https://analyticsdata.googleapis.com/v1beta";

export type GoogleAnalyticsProperty = {
  name: string;
  propertyId: string;
  displayName: string;
  accountName?: string;
};

export type GoogleAnalyticsSummary = {
  propertyId: string;
  startDate: string;
  endDate: string;
  rows: Array<{
    pagePath?: string;
    sessions: number;
    activeUsers: number;
    engagementRate?: number;
    conversions?: number;
  }>;
};

function config() {
  const clientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth no está configurado.");
  return { clientId, clientSecret };
}

export async function getGoogleAnalyticsAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = config();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  const data = (await response.json()) as { access_token?: string; error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description ?? "Google rechazó el token OAuth.");
  return data.access_token;
}

async function googleGet<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? `Google Analytics respondió ${response.status}.`);
  return data;
}

export async function listGoogleAnalyticsProperties(accessToken: string) {
  const accounts = await googleGet<{ accounts?: Array<{ name: string; displayName?: string }> }>(`${ADMIN_API}/accounts`, accessToken);
  const properties: GoogleAnalyticsProperty[] = [];
  for (const account of accounts.accounts ?? []) {
    const response = await googleGet<{ properties?: Array<{ name: string; displayName?: string }> }>(`${ADMIN_API}/${account.name}/properties`, accessToken);
    for (const property of response.properties ?? []) {
      const propertyId = property.name.replace(/^properties\//, "");
      properties.push({ name: property.name, propertyId, displayName: property.displayName ?? propertyId, accountName: account.displayName ?? account.name });
    }
  }
  return properties;
}

export async function queryGoogleAnalyticsSummary(accessToken: string, propertyId: string, startDate = "365daysAgo", endDate = "yesterday") {
  const response = await fetch(`${DATA_API}/properties/${encodeURIComponent(propertyId)}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "engagementRate" }, { name: "conversions" }],
      limit: "10000",
    }),
  });
  const data = (await response.json()) as { rows?: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }>; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? `Google Analytics respondió ${response.status}.`);
  return {
    propertyId, startDate, endDate,
    rows: (data.rows ?? []).map((row) => ({
      pagePath: row.dimensionValues?.[0]?.value,
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(row.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(row.metricValues?.[2]?.value ?? 0),
      conversions: Number(row.metricValues?.[3]?.value ?? 0),
    })),
  } satisfies GoogleAnalyticsSummary;
}
