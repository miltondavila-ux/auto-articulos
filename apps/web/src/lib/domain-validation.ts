import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";

/**
 * Normaliza cualquier formato de dominio o URL a su dominio base limpio
 * en minúsculas (sin protocolo, sin "www.", sin prefijo "sc-domain:", sin rutas ni puertos).
 *
 * Ejemplos:
 * - "https://www.lidiacapdevila.com/noticias" -> "lidiacapdevila.com"
 * - "sc-domain:segurosdesaludyvida.com" -> "segurosdesaludyvida.com"
 * - "http://MYSITE.COM:3000/" -> "mysite.com"
 * - "ejemplo.es" -> "ejemplo.es"
 */
export function normalizeDomain(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  let clean = raw.trim().toLowerCase();

  // Quitar prefijo de Google Search Console sc-domain:
  if (clean.startsWith("sc-domain:")) {
    clean = clean.replace(/^sc-domain:/, "").trim();
  }

  // Quitar protocolo http:// o https://
  clean = clean.replace(/^https?:\/\//, "");

  // Quitar rutas y query params (ej. "/noticias", "?ref=...")
  clean = clean.split("/")[0].split("?")[0].split("#")[0];

  // Quitar puerto si existe (ej. ":8080")
  clean = clean.split(":")[0];

  // Quitar prefijo www.
  clean = clean.replace(/^www\./, "");

  return clean.trim();
}

/**
 * Valida si las credenciales de 10minutesWebsite (username / email) ya están en uso
 * por otra cuenta o fueron utilizadas en un trial previo.
 *
 * Si el usuario es un trial activo (no desbloqueado por admin) y la cuenta de 10minutesWebsite
 * ya existe en otro usuario o en el registro histórico de trials, rechaza la operación.
 */
export async function validateAndRegisterTrialCredentials(
  userId: string,
  rawUsername: string,
): Promise<{ ok: boolean; error?: string }> {
  const normalizedUsername = rawUsername.trim().toLowerCase();
  if (!normalizedUsername) {
    return { ok: false, error: "El usuario de 10minutesWebsite es requerido." };
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isTrialSignup: true,
      trialUnlocked: true,
    },
  });

  if (!currentUser) {
    return { ok: false, error: "Usuario no encontrado." };
  }

  const isRestrictedTrial = currentUser.isTrialSignup && !currentUser.trialUnlocked && currentUser.role !== "admin";

  if (isRestrictedTrial) {
    // 1. Validar contra el registro histórico de trials
    const existingTrialRegistry = await prisma.trialDomainRegistry.findFirst({
      where: {
        accountUsername: normalizedUsername,
        userId: { not: userId },
      },
      include: {
        user: {
          select: { email: true, isTrialSignup: true, trialUnlocked: true },
        },
      },
    });

    if (existingTrialRegistry) {
      return {
        ok: false,
        error: `La cuenta de 10minutesWebsite "${normalizedUsername}" ya fue utilizada en una prueba gratuita anterior. Para reactivar tu acceso o contratar un plan, contacta al administrador.`,
      };
    }

    // 2. Validar contra credenciales activas de otros usuarios
    const otherCredentials = await prisma.credential.findMany({
      where: {
        userId: { not: userId },
        platform: "10minutesWebsite",
      },
      select: {
        userId: true,
        encryptedUsername: true,
      },
    });

    for (const cred of otherCredentials) {
      try {
        const decryptedUser = decryptSecret(cred.encryptedUsername).trim().toLowerCase();
        if (decryptedUser === normalizedUsername) {
          return {
            ok: false,
            error: `La cuenta de 10minutesWebsite "${normalizedUsername}" ya está vinculada a otro usuario en el sistema. Contacta al administrador para habilitar el acceso.`,
          };
        }
      } catch {
        // Ignorar credenciales que no puedan descifrarse
      }
    }
  }

  // Si es un usuario de prueba (o se guardó con éxito), registrar en la tabla histórica
  if (currentUser.isTrialSignup) {
    const existingEntry = await prisma.trialDomainRegistry.findFirst({
      where: { userId },
    });

    if (existingEntry) {
      await prisma.trialDomainRegistry.update({
        where: { id: existingEntry.id },
        data: { accountUsername: normalizedUsername },
      });
    } else {
      await prisma.trialDomainRegistry.create({
        data: {
          userId,
          accountUsername: normalizedUsername,
        },
      });
    }
  }

  return { ok: true };
}

/**
 * Valida si el dominio web (de Google Search Console, Bing o sitio web) ya fue
 * utilizado en una prueba gratuita anterior o pertenece a otro usuario.
 *
 * Si el usuario es un trial activo (no desbloqueado por admin) y el dominio ya fue usado,
 * bloquea la vinculación para impedir que abran cuentas de prueba infinitas.
 */
export async function validateAndRegisterTrialDomain(
  userId: string,
  rawDomainOrUrl: string,
): Promise<{ ok: boolean; error?: string; normalizedDomain: string }> {
  const cleanDomain = normalizeDomain(rawDomainOrUrl);
  if (!cleanDomain) {
    return { ok: true, normalizedDomain: "" };
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isTrialSignup: true,
      trialUnlocked: true,
    },
  });

  if (!currentUser) {
    return { ok: false, error: "Usuario no encontrado.", normalizedDomain: cleanDomain };
  }

  const isRestrictedTrial = currentUser.isTrialSignup && !currentUser.trialUnlocked && currentUser.role !== "admin";

  if (isRestrictedTrial) {
    // 1. Validar contra el registro histórico de trials
    const existingTrialRegistry = await prisma.trialDomainRegistry.findFirst({
      where: {
        normalizedDomain: cleanDomain,
        userId: { not: userId },
      },
      include: {
        user: {
          select: { email: true, isTrialSignup: true, trialUnlocked: true },
        },
      },
    });

    if (existingTrialRegistry) {
      return {
        ok: false,
        error: `El dominio "${cleanDomain}" ya fue utilizado en una prueba gratuita anterior. Para reactivar tu acceso o continuar publicando, contacta al administrador.`,
        normalizedDomain: cleanDomain,
      };
    }

    // 2. Validar contra SearchIntegrations de otros usuarios
    const otherIntegrations = await prisma.searchIntegration.findMany({
      where: {
        userId: { not: userId },
        siteUrl: { not: null },
      },
      select: {
        userId: true,
        siteUrl: true,
      },
    });

    for (const integration of otherIntegrations) {
      if (integration.siteUrl) {
        const otherClean = normalizeDomain(integration.siteUrl);
        if (otherClean === cleanDomain) {
          return {
            ok: false,
            error: `El dominio "${cleanDomain}" ya está registrado en otra cuenta del sistema. Contacta al administrador para solicitar acceso.`,
            normalizedDomain: cleanDomain,
          };
        }
      }
    }
  }

  // Si es un usuario de prueba, registrar el dominio en la tabla histórica
  if (currentUser.isTrialSignup) {
    const existingEntry = await prisma.trialDomainRegistry.findFirst({
      where: { userId },
    });

    if (existingEntry) {
      await prisma.trialDomainRegistry.update({
        where: { id: existingEntry.id },
        data: { normalizedDomain: cleanDomain },
      });
    } else {
      await prisma.trialDomainRegistry.create({
        data: {
          userId,
          normalizedDomain: cleanDomain,
        },
      });
    }
  }

  return { ok: true, normalizedDomain: cleanDomain };
}
