// Registro único de los servidores de la plataforma (User.platformDomain).
//
// La plataforma se sirve desde varios dominios distintos y una cuenta vive en
// UNO solo: el login y todos los datos (categorías, idiomas, artículos) son
// propios de ese servidor, así que entrar al equivocado falla aunque el
// usuario y la contraseña sean correctos.
//
// Antes esto era un condicional binario clavado en el worker
// (`platformDomain === "site" ? ... : ...`) y una lista de <option> repetida
// en el panel de Administración. El 14/8/2026 apareció una cuenta real
// (Estee Soto, agente inmobiliaria) alojada en un TERCER servidor,
// tagcrush.net, y no había forma de representarla: el sistema la mandaba a
// 10minuteswebsite.net por defecto y el login fallaba siempre. Al centralizar
// el registro acá, agregar un servidor nuevo es una línea en este objeto en
// vez de una cacería por el código.
//
// Verificado en vivo el 14/8/2026: tagcrush.net corre el MISMO software
// ("Panel de agentes" / "Agent Dashboard"), con el mismo selector de idioma
// y el mismo enlace "Using your Email + Password" que espera login() en el
// worker, así que basta con cambiar la URL base.

export interface PlatformServer {
  /** Origen al que se conecta el worker. Sin barra final. */
  baseUrl: string;
  /** Cómo se muestra en el panel de Administración. */
  label: string;
  // true = cuenta de marca blanca (confirmado por Milton, 15/8/2026:
  // "Tagcrush USA nuestra plataforma pero son una marca Blanca"). Sus
  // usuarios no deben ver ninguna mención a "10minutesWebsite" en la
  // interfaz — ver platformProductName().
  whiteLabel?: boolean;
}

export const PLATFORM_SERVERS = {
  net: {
    baseUrl: "https://10minuteswebsite.net",
    label: "10minuteswebsite.net",
    whiteLabel: false,
  },
  site: {
    baseUrl: "https://10minuteswebsite.site",
    label: "10minuteswebsite.site",
    whiteLabel: false,
  },
  tagcrush: {
    baseUrl: "https://tagcrush.net",
    label: "tagcrush.net (Panel de agentes)",
    whiteLabel: true,
  },
} as const satisfies Record<string, PlatformServer>;

export type PlatformDomain = keyof typeof PLATFORM_SERVERS;

/** Valor histórico por defecto: las cuentas viejas viven todas acá. */
export const DEFAULT_PLATFORM_DOMAIN: PlatformDomain = "net";

export const PLATFORM_DOMAIN_VALUES = Object.keys(
  PLATFORM_SERVERS,
) as PlatformDomain[];

export function isPlatformDomain(value: unknown): value is PlatformDomain {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(PLATFORM_SERVERS, value)
  );
}

/**
 * Normaliza cualquier valor guardado a un servidor conocido. Un valor
 * desconocido o nulo cae en el default histórico en vez de romper: es
 * exactamente lo que hacía el condicional anterior.
 */
export function normalizePlatformDomain(value: unknown): PlatformDomain {
  return isPlatformDomain(value) ? value : DEFAULT_PLATFORM_DOMAIN;
}

/** URL base del servidor donde vive la cuenta. */
export function platformBaseUrl(value: unknown): string {
  return PLATFORM_SERVERS[normalizePlatformDomain(value)].baseUrl;
}

/** Etiqueta legible, para la interfaz de Administración. */
export function platformLabel(value: unknown): string {
  return PLATFORM_SERVERS[normalizePlatformDomain(value)].label;
}

/** Pantalla de recuperación de contraseña del servidor correspondiente. */
export function platformForgotPasswordUrl(value: unknown): string {
  return `${platformBaseUrl(value)}/dashboard/forgot-password.php`;
}

export function isWhiteLabelPlatform(value: unknown): boolean {
  return Boolean(PLATFORM_SERVERS[normalizePlatformDomain(value)].whiteLabel);
}

/**
 * Nombre de marca a mostrar en texto visible para la persona usuaria.
 * Cuentas de marca blanca (tagcrush) nunca deben ver "10minutesWebsite" —
 * se usa un término genérico en su lugar. El resto ve el nombre real, que
 * es correcto para ellos.
 */
export function platformProductName(value: unknown): string {
  return isWhiteLabelPlatform(value) ? "tu plataforma" : "10minutesWebsite";
}

/**
 * Enlace de ayuda/soporte de la plataforma. null en cuentas de marca
 * blanca: no hay un URL real de soporte de tagcrush conocido, y mostrar el
 * de 10minutesWebsite rompería la marca blanca y mandaría a la persona a
 * soporte equivocado. Quien renderiza debe ocultar el enlace si es null,
 * no inventar uno.
 */
export function platformHelpUrl(value: unknown): string | null {
  return isWhiteLabelPlatform(value)
    ? null
    : "https://www.10minuteswebsite.com/ayuda";
}
