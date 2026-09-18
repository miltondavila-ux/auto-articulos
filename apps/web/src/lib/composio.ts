import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";

/**
 * Conexión con Composio (https://composio.dev) desde Administración.
 *
 * Se usa la API REST con clave de proyecto (`x-api-key`) porque el panel corre
 * en funciones serverless: el CLI de Composio no se puede instalar ahí y el
 * MCP público (connect.composio.dev/mcp) exige un login OAuth interactivo.
 * La clave se guarda cifrada en SystemSetting, igual que las apps de redes
 * sociales; nunca se devuelve completa al navegador.
 *
 * Fase 1 (ver FASE_0_ARQUITECTURA_CONEXION_COMPOSIO.md): solo clave, auth
 * configs y lectura de cuentas conectadas. No modifica ninguna integración
 * existente de Google ni de Meta.
 */

export const COMPOSIO_API_BASE = "https://backend.composio.dev/api/v3.1";
export const COMPOSIO_MCP_URL = "https://connect.composio.dev/mcp";
export const COMPOSIO_CLI_INSTALL = "curl -fsSL https://composio.dev/install | sh";

const API_KEY_SETTING = "composio_api_key";
const REQUEST_TIMEOUT_MS = 10_000;
const MIN_API_KEY_LENGTH = 10;

/** Apps que se podrán conectar por Composio (Blueprint §5). */
export const COMPOSIO_APPS = [
  { id: "google_search_console", label: "Google Search Console", toolkit: "google_search_console" },
  { id: "google_analytics", label: "Google Analytics", toolkit: "google_analytics" },
  { id: "facebook", label: "Facebook Pages", toolkit: "facebook" },
  { id: "instagram", label: "Instagram", toolkit: "instagram" },
] as const;

export type ComposioAppId = (typeof COMPOSIO_APPS)[number]["id"];

export function findComposioApp(id: unknown) {
  return COMPOSIO_APPS.find((app) => app.id === id) ?? null;
}

export class ComposioError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "ComposioError";
  }
}

async function readSecretSetting(key: string): Promise<string | null> {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  if (!setting) return null;
  try {
    return decryptSecret(setting.encryptedValue);
  } catch {
    // Valor ilegible (por ejemplo, cambió CREDENTIALS_ENCRYPTION_KEY): se trata
    // como no configurado para que el admin pueda guardar uno nuevo.
    return null;
  }
}

async function writeSecretSetting(key: string, value: string): Promise<void> {
  const encryptedValue = encryptSecret(value);
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, encryptedValue },
    update: { encryptedValue },
  });
}

export function getStoredComposioApiKey(): Promise<string | null> {
  return readSecretSetting(API_KEY_SETTING);
}

export function saveComposioApiKey(apiKey: string): Promise<void> {
  return writeSecretSetting(API_KEY_SETTING, apiKey);
}

export async function deleteComposioApiKey(): Promise<void> {
  await prisma.systemSetting.deleteMany({ where: { key: API_KEY_SETTING } });
}

export function isPlausibleComposioApiKey(value: string): boolean {
  return value.length >= MIN_API_KEY_LENGTH && !/\s/.test(value);
}

/** Muestra solo el final de la clave; el resto nunca sale del servidor. */
export function maskComposioApiKey(apiKey: string): string {
  return `••••••••${apiKey.slice(-4)}`;
}

// --- Auth configs (uno por toolkit, se crean una vez en el panel de Composio) ---

const AUTH_CONFIG_ID_PATTERN = /^ac_[A-Za-z0-9_-]{6,64}$/;

function authConfigSettingKey(app: ComposioAppId): string {
  return `composio_auth_config_${app}`;
}

export function isPlausibleAuthConfigId(value: string): boolean {
  return AUTH_CONFIG_ID_PATTERN.test(value);
}

export async function getStoredAuthConfigIds(): Promise<Record<ComposioAppId, string | null>> {
  const entries = await Promise.all(
    COMPOSIO_APPS.map(
      async (app) => [app.id, await readSecretSetting(authConfigSettingKey(app.id))] as const,
    ),
  );
  return Object.fromEntries(entries) as Record<ComposioAppId, string | null>;
}

export function saveAuthConfigId(app: ComposioAppId, authConfigId: string): Promise<void> {
  return writeSecretSetting(authConfigSettingKey(app), authConfigId);
}

export async function deleteAuthConfigId(app: ComposioAppId): Promise<void> {
  await prisma.systemSetting.deleteMany({ where: { key: authConfigSettingKey(app) } });
}

/** Los auth configs pertenecen al proyecto de la clave: si esta cambia, dejan de valer. */
export async function deleteAllAuthConfigIds(): Promise<void> {
  await prisma.systemSetting.deleteMany({
    where: { key: { in: COMPOSIO_APPS.map((app) => authConfigSettingKey(app.id)) } },
  });
}

// --- Cliente HTTP ---

interface ComposioErrorBody {
  error?: { message?: string; slug?: string };
}

async function composioGet<T>(
  apiKey: string,
  path: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const url = new URL(`${COMPOSIO_API_BASE}${path}`);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, String(value));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "x-api-key": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new ComposioError(
      "No se pudo contactar a Composio. Intenta de nuevo en unos minutos.",
      null,
    );
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new ComposioError(
        "Composio rechazó la clave de API. Revisa que sea la clave de proyecto correcta y que tenga los permisos necesarios.",
        response.status,
      );
    }
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? ` Espera ${retryAfter} s.` : "";
      throw new ComposioError(`Composio alcanzó su límite de solicitudes.${wait}`, 429);
    }
    let detail = "";
    try {
      const body = (await response.json()) as ComposioErrorBody;
      detail = body.error?.message ?? "";
    } catch {
      // Cuerpo no JSON: se usa el mensaje genérico según el estado.
    }
    throw new ComposioError(
      detail || `Composio respondió con el error ${response.status}.`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

export type ComposioVerification =
  | { valid: true }
  | { valid: false; reason: string; status: number | null };

/** Comprueba la clave con la lectura más barata de la API (1 toolkit). */
export async function verifyComposioApiKey(
  apiKey: string,
): Promise<ComposioVerification> {
  try {
    await composioGet(apiKey, "/toolkits", { limit: 1 });
    return { valid: true };
  } catch (error) {
    if (error instanceof ComposioError) {
      return { valid: false, reason: error.message, status: error.status };
    }
    throw error;
  }
}

/**
 * Comprueba que el auth config exista en el proyecto y, si Composio informa a
 * qué toolkit pertenece, que sea el de la app elegida. Evita guardar el id de
 * Gmail en la casilla de Instagram, por ejemplo.
 */
export async function verifyAuthConfig(
  apiKey: string,
  app: ComposioAppId,
  authConfigId: string,
): Promise<ComposioVerification> {
  const expected = COMPOSIO_APPS.find((item) => item.id === app)!;
  try {
    const body = await composioGet<{ toolkit?: { slug?: string } | null }>(
      apiKey,
      `/auth_configs/${encodeURIComponent(authConfigId)}`,
    );
    const actual = body.toolkit?.slug;
    if (actual && actual.toLowerCase() !== expected.toolkit) {
      return {
        valid: false,
        reason: `Ese auth config es del toolkit "${actual}", no de ${expected.label}.`,
        status: 400,
      };
    }
    return { valid: true };
  } catch (error) {
    if (error instanceof ComposioError) {
      if (error.status === 404) {
        return {
          valid: false,
          reason: "Composio no encuentra ese auth config en el proyecto de esta clave.",
          status: 404,
        };
      }
      return { valid: false, reason: error.message, status: error.status };
    }
    throw error;
  }
}

// --- Cuentas conectadas ---

export interface ComposioConnectedAccount {
  id: string;
  status: string;
  toolkit: string | null;
  userId: string | null;
  createdAt: string | null;
}

interface RawConnectedAccount {
  id?: string;
  status?: string;
  toolkit?: { slug?: string } | null;
  user_id?: string | null;
  created_at?: string | null;
}

export async function listComposioConnectedAccounts(
  apiKey: string,
  limit = 50,
): Promise<ComposioConnectedAccount[]> {
  const body = await composioGet<{ items?: RawConnectedAccount[] }>(
    apiKey,
    "/connected_accounts",
    { limit },
  );
  return (body.items ?? [])
    .filter((item): item is RawConnectedAccount & { id: string } => Boolean(item.id))
    .map((item) => ({
      id: item.id,
      status: item.status ?? "UNKNOWN",
      toolkit: item.toolkit?.slug ?? null,
      userId: item.user_id ?? null,
      createdAt: item.created_at ?? null,
    }));
}
