import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";

export interface SystemModule {
  id: string;
  label: string;
  href: string;
  description: string;
}

export const SYSTEM_MODULES: SystemModule[] = [
  {
    id: "publicar",
    label: "Publicar",
    href: "/dashboard/publicar",
    description: "Generación y publicación de artículos individuales y en lote.",
  },
  {
    id: "publicaciones-en-curso",
    label: "Publicaciones en Curso",
    href: "/dashboard/publicaciones-en-curso",
    description: "Monitoreo en tiempo real de artículos y lotes en procesamiento.",
  },
  {
    id: "oportunidades",
    label: "Oportunidades",
    href: "/dashboard/oportunidades",
    description: "Análisis de oportunidades SEO con Google Search Console y Bing.",
  },
  {
    id: "oportunidades-redes",
    label: "Oportunidades Redes",
    href: "/dashboard/oportunidades-redes",
    description: "Distribución de contenido e ideas para redes sociales.",
  },
  {
    id: "historial",
    label: "Historial",
    href: "/dashboard/historial",
    description: "Historial completo de artículos publicados y eventos de log.",
  },
  {
    id: "configuracion",
    label: "Configuración",
    href: "/dashboard/configuracion",
    description: "Ajustes de cuenta, idioma, integraciones y llaves del sistema.",
  },
  {
    id: "actualizaciones",
    label: "Actualizaciones",
    href: "/dashboard/actualizaciones",
    description: "Registro de novedades, cambios y mejoras visibles del sistema.",
  },
  {
    id: "como-funciona",
    label: "Cómo Funciona",
    href: "/dashboard/como-funciona",
    description: "Explicación visual del flujo de trabajo y automatización del sistema.",
  },
];

export const GLOBAL_DISABLED_MODULES_KEY = "global_disabled_modules";

/**
 * Obtiene los módulos deshabilitados globalmente (para todos los usuarios regulares).
 */
export async function getGlobalDisabledModules(): Promise<string[]> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: GLOBAL_DISABLED_MODULES_KEY },
    });
    if (!setting?.encryptedValue) return [];

    let raw = "";
    try {
      raw = decryptSecret(setting.encryptedValue);
    } catch {
      raw = setting.encryptedValue;
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch (error) {
    console.error("[modules] Error leyendo módulos deshabilitados globales:", error);
    return [];
  }
}

/**
 * Guarda la lista de módulos deshabilitados globalmente.
 */
export async function setGlobalDisabledModules(moduleIds: string[]): Promise<void> {
  const cleanIds = Array.from(new Set(moduleIds.filter((id) => typeof id === "string" && id.trim() !== "")));
  const serialized = JSON.stringify(cleanIds);
  const encryptedValue = encryptSecret(serialized);

  await prisma.systemSetting.upsert({
    where: { key: GLOBAL_DISABLED_MODULES_KEY },
    create: {
      key: GLOBAL_DISABLED_MODULES_KEY,
      encryptedValue,
    },
    update: {
      encryptedValue,
    },
  });
}

/**
 * Parsea los módulos deshabilitados configurados específicamente para un usuario.
 */
export function parseUserDisabledModules(rawDisabledModules?: string | null): string[] {
  if (!rawDisabledModules) return [];
  try {
    const parsed = JSON.parse(rawDisabledModules);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Calcula los módulos efectivamente deshabilitados para un usuario.
 * Los administradores no tienen módulos bloqueados para poder realizar tareas de soporte y mantenimiento.
 */
export function getEffectiveDisabledModules(
  user: { role?: string; disabledModules?: string | null },
  globalDisabled: string[],
): string[] {
  if (user.role === "admin") {
    return [];
  }
  const userDisabled = parseUserDisabledModules(user.disabledModules);
  return Array.from(new Set([...globalDisabled, ...userDisabled]));
}
