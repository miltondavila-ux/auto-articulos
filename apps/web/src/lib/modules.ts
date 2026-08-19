import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";

export interface SystemModule {
  id: string;
  label: string;
  href: string;
  description: string;
}

// El orden es el mismo que el del menú (ver DashboardNav), para que el panel
// de Administración se lea igual que lo que ve la persona usuaria. Ya no
// afecta a la seguridad: ModuleGuard elige la coincidencia más específica, no
// la primera de la lista.
export const SYSTEM_MODULES: SystemModule[] = [
  {
    id: "como-funciona",
    label: "Cómo Funciona",
    href: "/dashboard/como-funciona",
    description: "Explicación visual del flujo de trabajo y automatización del sistema.",
  },
  {
    id: "publicar",
    label: "Publicar",
    href: "/dashboard/publicar",
    description: "Generación y publicación de artículos individuales y en lote.",
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
    id: "publicaciones-en-curso",
    label: "Publicaciones en Curso",
    href: "/dashboard/publicaciones-en-curso",
    description: "Monitoreo en tiempo real de artículos y lotes en procesamiento.",
  },
  {
    id: "historial",
    label: "Historial",
    href: "/dashboard/historial",
    description: "Historial completo de artículos publicados y eventos de log.",
  },
  {
    id: "actualizaciones",
    label: "Actualizaciones",
    href: "/dashboard/actualizaciones",
    description: "Registro de novedades, cambios y mejoras visibles del sistema.",
  },
  {
    id: "configuracion",
    label: "Configuración",
    href: "/dashboard/configuracion",
    description: "Ajustes de cuenta, idioma, integraciones y llaves del sistema.",
  },
];

export const GLOBAL_DISABLED_MODULES_KEY = "global_disabled_modules";

/*
 * Permiso de módulo por usuario, en tres posturas. Antes solo existía una
 * lista de "apagados", que no distinguía entre "no lo ve porque está oculto
 * para todos" y "a esta persona se lo quité". Por eso el acceso de una cuenta
 * concreta acababa clavado en el código.
 */
export type ModuleAccessOverride = "inherit" | "enabled" | "disabled";
export type ModuleAccessOverrides = Record<string, ModuleAccessOverride>;

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
  const overrides = parseUserModuleOverrides(user.disabledModules);
  const effective = new Set(globalDisabled);
  for (const [moduleId, access] of Object.entries(overrides)) {
    if (access === "enabled") effective.delete(moduleId);
    if (access === "disabled") effective.add(moduleId);
  }
  return Array.from(effective);
}

/**
 * Lee el formato nuevo de excepciones conservando compatibilidad con el array
 * anterior: una lista de ids se interpreta como "forzar deshabilitado" en cada
 * uno, que es exactamente lo que significaba antes.
 */
export function parseUserModuleOverrides(raw?: string | null): ModuleAccessOverrides {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return Object.fromEntries(
        parsed
          .filter((id): id is string => typeof id === "string")
          .map((id) => [id, "disabled" as const]),
      );
    }
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, value]) =>
          value === "inherit" || value === "enabled" || value === "disabled",
      ),
    ) as ModuleAccessOverrides;
  } catch {
    return {};
  }
}
