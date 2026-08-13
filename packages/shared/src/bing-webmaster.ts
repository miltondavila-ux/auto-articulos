const TOKEN_URL = "https://www.bing.com/webmasters/oauth/token";
const API_BASE = "https://ssl.bing.com/webmaster/api.svc/json";
// Bug real encontrado el 12/8/2026 (cuenta de Julio Paso): SubmitUrl fallaba
// siempre con "ERROR!!! InvalidToken", con el mismo access token que
// funcionaba bien un instante antes para listar sitios. La documentación
// oficial de Microsoft (learn.microsoft.com/en-us/bingwebmaster/oauth2,
// actualizada 7/8/2026) muestra el endpoint de SubmitUrl como
// www.bing.com/webmaster/api.svc/json/SubmitUrl — no ssl.bing.com. Se separa
// la base para las operaciones de ESCRITURA (SubmitUrl, SubmitFeed, mismo
// patrón), sin tocar listBingSites (lectura), que sí funciona hoy en
// ssl.bing.com — no arriesgar algo que ya funciona sin evidencia de que
// también esté roto.
const API_BASE_WRITE = "https://www.bing.com/webmaster/api.svc/json";

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
  /**
   * Red de seguridad: la medición del 13/8/2026 mostró que Bing NO rota el
   * refresh token (nunca devuelve uno nuevo en el refresh). Se conserva por si
   * algún día empieza a hacerlo, pero hoy siempre viene `undefined`.
   */
  rotatedRefreshToken?: string;
}

/** Espera con backoff entre reintentos. */
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * CAUSA RAÍZ REAL, medida el 13/8/2026 contra la cuenta de Lorena Álvarez:
 * **el endpoint de token de Bing rechaza tokens VÁLIDOS de forma
 * intermitente.**
 *
 * La medición (endpoint /api/bing/diagnostico, tres llamadas seguidas con el
 * mismo token) devolvió:
 *   - 1ª llamada: HTTP 400 `invalid_grant: Refresh token is invalid or expired.`
 *   - 2ª llamada, EL MISMO token, milisegundos después: HTTP 200, expires_in 3600
 *   - `refresh_token` nuevo en la respuesta: ninguno, nunca
 *
 * O sea que el token no estaba vencido en absoluto. Sin reintento, ese rechazo
 * aleatorio se propagaba como "tu conexión con Bing venció" y mandaba al
 * usuario a reautorizar una cuenta que estaba perfecta — se hizo tres veces
 * seguidas antes de medirlo. Es también la explicación del `InvalidToken`
 * intermitente que documenta apps/worker/src/bingIndexing.ts, donde dentro de
 * un mismo lote unos títulos pasaban y otros no con el mismo token.
 *
 * Por eso acá se reintenta. NO se reintenta ante `invalid_client`: ese sí es un
 * error de configuración real (client_id/client_secret que no corresponden a
 * la app OAuth registrada en Bing) y reintentarlo solo retrasa el diagnóstico.
 */
export async function getBingAccessToken(
  refreshToken: string,
): Promise<BingTokenResult> {
  const { clientId, clientSecret } = bingConfig();
  const INTENTOS = 3;
  const ESPERAS_MS = [400, 1200];
  let ultimoDetalle = "sin respuesta de Bing";

  for (let intento = 1; intento <= INTENTOS; intento++) {
    let data: {
      access_token?: string;
      refresh_token?: string;
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
        return {
          accessToken: data.access_token,
          rotatedRefreshToken:
            data.refresh_token && data.refresh_token !== refreshToken
              ? data.refresh_token
              : undefined,
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
