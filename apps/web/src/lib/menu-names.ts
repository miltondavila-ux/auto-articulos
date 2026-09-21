/*
 * NOMBRES EN EL MENU — fuente única de los nombres de las tres opciones
 * numeradas del grupo «Publicaciones».
 *
 * Sin imports de servidor (ni Prisma) a propósito: lo leen el menú, las
 * pantallas, los botones, el manual de usuario y el asistente. Si un nombre
 * cambia, se corrige aquí y queda corregido en todos esos sitios. No escribir
 * estos nombres a mano en ningún texto nuevo: importar MENU_NAMES.
 */
export const MENU_NAMES = {
  /** /dashboard/publicar — la persona escribe sus propios títulos. */
  propios: "Artículos propios",
  /** /dashboard/oportunidades — artículos creados con la IA avanzada. */
  ia: "Artículos creados con IA",
  /** /dashboard/oportunidades-redes — difusión en redes con IA. */
  redes: "Redes sociales: publicaciones con IA",
} as const;

/** Cómo se ven en el desplegable del menú, con su número de orden. */
export const MENU_LABELS_NUMBERED = {
  propios: `1) ${MENU_NAMES.propios}`,
  ia: `2) ${MENU_NAMES.ia}`,
  redes: `3) ${MENU_NAMES.redes}`,
} as const;

/**
 * Nombres que tuvieron antes estas mismas opciones. Solo se usan para que el
 * asistente entienda novedades antiguas (ProductUpdate) que aún los mencionan;
 * nunca se muestran como nombre actual.
 */
export const MENU_NAMES_ANTERIORES = {
  propios: ["Publica tus propios títulos", "Publicaciones propias", "Publicar"],
  ia: ["Publica contenido con ayuda de la IA avanzada", "Oportunidades SEO/AEO"],
  redes: ["Difunde tu contenido en blogs externos y redes sociales", "Oportunidades para Redes Sociales"],
} as const;
