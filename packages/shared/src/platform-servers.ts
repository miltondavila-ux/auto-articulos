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
  /** Persona de contacto que ve la persona usuaria de este servidor. */
  contactName: string;
  /** Correo de contacto de este servidor. */
  contactEmail: string;
  /** Servicio técnico / ayuda de este servidor. */
  helpUrl: string;
}

export const PLATFORM_SERVERS = {
  net: {
    baseUrl: "https://10minuteswebsite.net",
    label: "10minuteswebsite.net",
    whiteLabel: false,
    contactName: "Milton Dávila",
    contactEmail: "milton@10minuteswebsite.com",
    helpUrl: "https://www.10minuteswebsite.com/ayuda",
  },
  site: {
    baseUrl: "https://10minuteswebsite.site",
    label: "10minuteswebsite.site",
    whiteLabel: false,
    contactName: "Milton Dávila",
    contactEmail: "milton@10minuteswebsite.com",
    helpUrl: "https://www.10minuteswebsite.com/ayuda",
  },
  // ATENCIÓN a los dominios, no son un error tipográfico: el panel de agentes
  // de tagcrush vive en tagcrush.NET (baseUrl, donde entra el worker), pero su
  // contacto y su servicio técnico están en tagcrush.COM. Datos dados por
  // Milton el 18/8/2026. No "corregir" uno para que coincida con el otro.
  tagcrush: {
    baseUrl: "https://tagcrush.net",
    label: "tagcrush.net (Panel de agentes)",
    whiteLabel: true,
    contactName: "Estee Soto",
    contactEmail: "info@tagcrush.com",
    helpUrl: "https://www.tagcrush.com/customer-service-chat",
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

/**
 * Pantalla de recuperación de contraseña del servidor correspondiente.
 *
 * No es simplemente `${baseUrl}/dashboard/forgot-password.php`: tagcrush.net
 * tiene su propia recuperación, pero net Y site comparten la misma — vive en
 * www.10minuteswebsite.net incluso para cuentas alojadas en el dominio .site.
 * Confirmado por Milton, 18/8/2026.
 */
export function platformForgotPasswordUrl(value: unknown): string {
  return isWhiteLabelPlatform(value)
    ? `${platformBaseUrl(value)}/dashboard/forgot-password.php`
    : "https://www.10minuteswebsite.net/dashboard/forgot-password.php";
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
 * Enlace de ayuda/soporte del servidor correspondiente.
 *
 * Antes devolvía null para marca blanca porque no se conocía un soporte
 * propio de tagcrush y mandar a esa gente al de 10minutesWebsite rompía la
 * marca blanca. El 18/8/2026 Milton dio el enlace real de tagcrush, así que
 * ahora cada servidor tiene el suyo. Se mantiene el tipo `string | null`
 * para no romper a quienes ya comprueban el null antes de renderizar.
 */
export function platformHelpUrl(value: unknown): string | null {
  return PLATFORM_SERVERS[normalizePlatformDomain(value)].helpUrl;
}

/** Persona de contacto del servidor correspondiente. */
export function platformContactName(value: unknown): string {
  return PLATFORM_SERVERS[normalizePlatformDomain(value)].contactName;
}

/** Correo de contacto del servidor correspondiente. */
export function platformContactEmail(value: unknown): string {
  return PLATFORM_SERVERS[normalizePlatformDomain(value)].contactEmail;
}
