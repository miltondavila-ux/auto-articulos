// Único lugar que define el límite diario de artículos que reciben las
// cuentas nuevas. Cambiar este número aquí es suficiente para que el
// formulario de creación de usuarios y la API de administración queden
// alineados — no hay que tocarlos por separado.
export const DEFAULT_DAILY_ARTICLE_LIMIT = 5;

// Valor de respaldo mientras el frontend todavía no recibió el
// maxTitlesPerBatch real del usuario (vía /api/me). Una sola constante
// compartida para que Oportunidades y Publicar nunca muestren números
// distintos entre sí durante la carga.
export const DEFAULT_MAX_TITLES_PER_BATCH = 20;
