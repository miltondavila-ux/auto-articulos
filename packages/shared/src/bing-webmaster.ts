const TOKEN_URL = "https://www.bing.com/webmasters/oauth/token";
// Endpoints oficiales de la API de Bing Webmaster Tools (v2 / OAuth 2.0).
// Se usa www.bing.com en todos los endpoints (lectura y escritura) ya que
// ssl.bing.com devuelve "ERROR!!! InvalidToken" al validar Bearer tokens OAuth.
const API_BASE = "https://www.bing.com/webmaster/api.svc/json";
const API_BASE_WRITE = API_BASE;

function bingConfig() {
  const clientId = process.env.BING_WEBMASTER_CLIENT_ID;
  const clientSecret = process.env.BING_WEBMASTER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Bing Webmaster Tools OAuth no está configurado.");
  }
  return { clientId, clientSecret };
}

export interface BingTokenResult {
  accessToken: string;
  expiresInSeconds?: number;
  rotatedRefreshToken?: string;
}

export interface BingTokenPayload {
  refreshToken: string;
  accessToken?: string;
  expiresAt?: number;
}

export function parseBingTokenPayload(raw: string): BingTokenPayload {
  try {
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw);
      if (parsed.refreshToken) return parsed;
    }
  } catch {}
  return { refreshToken: raw };
}

export function formatBingTokenPayload(payload: BingTokenPayload): string {
  return JSON.stringify(payload);
}

/** Espera con backoff entre reintentos. */
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

const tokenCache = new Map<string, { accessToken: string; expiresAt: number }>();

export async function getBingAccessToken(
  refreshToken: string,
): Promise<BingTokenResult> {
  const cached = tokenCache.get(refreshToken);
  if (cached && Date.now() < cached.expiresAt) {
    return { accessToken: cached.accessToken };
  }

  const { clientId, clientSecret } = bingConfig();
  const INTENTOS = 4;
  const ESPERAS_MS = [500, 1500, 3000];
  let ultimoDetalle = "sin respuesta de Bing";

  for (let intento = 1; intento <= INTENTOS; intento++) {
    let data: {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    } = {};
    let status = 0;

    try {
      const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });
      status = response.status;
      data = (await response.json().catch(() => ({}))) as typeof data;

      if (response.ok && data.access_token) {
        const expiresInSeconds = data.expires_in ?? 3600;
        tokenCache.set(refreshToken, {
          accessToken: data.access_token,
          // Guardar con margen de 5 minutos antes del vencimiento real
          expiresAt: Date.now() + Math.max((expiresInSeconds - 300) * 1000, 60000),
        });

        return {
          accessToken: data.access_token,
          expiresInSeconds,
          // No rotar refresh token: conservar el original emitido en callback
          rotatedRefreshToken: undefined,
        };
      }
      ultimoDetalle =
        data.error_description ?? data.error ?? `HTTP ${status}`;
    } catch (error) {
      ultimoDetalle = error instanceof Error ? error.message : String(error);
    }

    // `invalid_client` no es intermitente: son credenciales que no coinciden
    // con la app registrada en Bing. Reintentar no lo va a arreglar.
    if (data.error === "invalid_client") break;

    if (intento < INTENTOS) await dormir(ESPERAS_MS[intento - 1]);
  }

  throw new Error(
    `La conexión con Bing venció o fue revocada: hay que volver a autorizar la cuenta. (Bing respondió, tras ${INTENTOS} intentos: ${ultimoDetalle})`,
  );
}

export interface BingSite {
  Url: string;
  IsVerified: boolean;
}

export async function listBingSites(accessToken: string): Promise<BingSite[]> {
  const response = await fetch(`${API_BASE}/GetUserSites`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await response.json().catch(() => ({}))) as {
    d?: BingSite[];
    ErrorCode?: number;
    Message?: string;
  };
  if (!response.ok) {
    throw new Error(
      data.Message ?? "No se pudieron listar los sitios de Bing Webmaster Tools.",
    );
  }
  return (data.d ?? []).filter((site) => site.IsVerified);
}

/**
 * Pedido explícito del usuario (11/8/2026): Google ya detecta y precarga el
 * sitemap automáticamente cuando el usuario elige su propiedad (ver
 * listGoogleSitemaps en google-search-console.ts); Bing no tenía el mismo
 * comportamiento y obligaba a escribirlo siempre a mano. Mismo patrón
 * defensivo: si esto falla (nombre real del endpoint no confirmado contra
 * una cuenta real todavía), no bloquea nada — el campo sigue editable a mano
 * como respaldo, igual que ya pasa con Google.
 */
export async function listBingSitemaps(
  accessToken: string,
  siteUrl: string,
): Promise<string[]> {
  const response = await fetch(
    `${API_BASE}/GetSitemaps?siteUrl=${encodeURIComponent(siteUrl)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data = (await response.json().catch(() => ({}))) as {
    d?: Array<{ Url?: string }>;
    Message?: string;
  };
  if (!response.ok) {
    throw new Error(
      data.Message ?? "No se pudieron listar los sitemaps de Bing Webmaster Tools.",
    );
  }
  return (data.d ?? [])
    .map((s) => s.Url)
    .filter((url): url is string => Boolean(url));
}

export async function submitBingSitemap(
  accessToken: string,
  siteUrl: string,
  feedUrl: string,
) {
  const response = await fetch(`${API_BASE_WRITE}/SubmitFeed`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ siteUrl, feedUrl }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      Message?: string;
    };
    throw new Error(
      data.Message ?? `Bing Webmaster Tools respondió ${response.status}.`,
    );
  }
}

export interface BingQueryStat {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
}

/**
 * Consultas reales del sitio en Bing (últimos ~6 meses, es lo único que
 * expone GetQueryStats — no admite rango de fechas propio como Search
 * Console). Se usa como evidencia adicional para el análisis de
 * oportunidades (pedido explícito de Milton, 2/9/2026: el algoritmo de
 * oportunidades solo miraba Search Console y GA4, nunca Bing). Cada consulta
 * puede aparecer varias veces (una fila por fecha); se agregan sumando
 * clics/impresiones y promediando la posición ponderada por impresiones.
 */
export async function getBingQueryStats(
  accessToken: string,
  siteUrl: string,
): Promise<BingQueryStat[]> {
  const response = await fetch(
    `${API_BASE}/GetQueryStats?siteUrl=${encodeURIComponent(siteUrl)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data = (await response.json().catch(() => ({}))) as {
    d?: Array<{
      Query?: string;
      Clicks?: number;
      Impressions?: number;
      AvgImpressionPosition?: number;
      AvgClickPosition?: number;
    }>;
    Message?: string;
  };
  if (!response.ok) {
    throw new Error(
      data.Message ?? "No se pudieron obtener las consultas de Bing Webmaster Tools.",
    );
  }

  const byQuery = new Map<
    string,
    { clicks: number; impressions: number; weightedPosition: number }
  >();
  for (const row of data.d ?? []) {
    const query = row.Query?.trim();
    if (!query) continue;
    const clicks = row.Clicks ?? 0;
    const impressions = row.Impressions ?? 0;
    const position = row.AvgImpressionPosition ?? row.AvgClickPosition ?? 0;
    const existing = byQuery.get(query) ?? {
      clicks: 0,
      impressions: 0,
      weightedPosition: 0,
    };
    existing.clicks += clicks;
    existing.impressions += impressions;
    existing.weightedPosition += position * impressions;
    byQuery.set(query, existing);
  }

  return Array.from(byQuery.entries())
    .map(([query, agg]) => ({
      query,
      clicks: agg.clicks,
      impressions: agg.impressions,
      position: agg.impressions > 0 ? agg.weightedPosition / agg.impressions : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions);
}

export interface BingUrlQuota {
  daily: number;
  monthly: number;
}

/**
 * Cupo de envío de URLs que le queda al sitio. La documentación de Microsoft
 * dice explícitamente que hay que consultarlo ANTES de enviar
 * ("It is possible to submit only limited number of url. GetUrlSubmissionQuota
 * should be called to determine how much urls can be submitted"), y su propio
 * ejemplo devuelve DailyQuota=5 / MonthlyQuota=24. O sea: unidades por día, no
 * los 10.000 que asumía el comentario de submitBingUrl — esa cifra es el tope
 * para sitios grandes ya establecidos, no para los de estos clientes.
 */
export async function getBingUrlQuota(
  accessToken: string,
  siteUrl: string,
): Promise<BingUrlQuota> {
  const response = await fetch(
    `${API_BASE}/GetUrlSubmissionQuota?siteUrl=${encodeURIComponent(siteUrl)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data = (await response.json().catch(() => ({}))) as {
    d?: { DailyQuota?: number; MonthlyQuota?: number };
    Message?: string;
  };
  if (!response.ok) {
    throw new Error(
      data.Message ?? `Bing Webmaster Tools respondió ${response.status}.`,
    );
  }
  return {
    daily: data.d?.DailyQuota ?? 0,
    monthly: data.d?.MonthlyQuota ?? 0,
  };
}

/**
 * Pide indexación instantánea de UNA url — a diferencia de Google (cuya
 * Indexing API solo aplica a ofertas de empleo/transmisiones en vivo), Bing
 * sí permite esto para cualquier contenido. El cupo NO es de 10.000 URLs/día
 * como decía este comentario antes: esa es la cifra máxima para sitios grandes
 * ya establecidos. El cupo real de cada sitio se consulta con getBingUrlQuota()
 * y para sitios chicos es de pocas unidades por día (el ejemplo de la propia
 * documentación de Microsoft devuelve 5 diarias / 24 mensuales).
 */
export async function submitBingUrl(
  accessToken: string,
  siteUrl: string,
  url: string,
) {
  const response = await fetch(`${API_BASE_WRITE}/SubmitUrl`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ siteUrl, url }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      Message?: string;
    };
    throw new Error(
      data.Message ?? `Bing Webmaster Tools respondió ${response.status}.`,
    );
  }
}
