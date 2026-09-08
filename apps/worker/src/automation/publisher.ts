// Interfaz común de publicación (2026-09-07/08, "MCP 10MWS").
//
// Hasta ahora el worker solo sabía publicar de una forma: manejando un
// navegador (`10minutesWebsite.ts`). Esta interfaz es el "puerto" que pidió
// Milton para poder agregar una segunda línea de ejecución (MCP) sin tocar
// la primera, y para que mañana WordPress/Wix entren de la misma forma.
//
// No reemplaza nada: `browserPublisher.ts` envuelve las funciones ya
// existentes de `10minutesWebsite.ts` tal cual son hoy, sin cambiar su
// lógica interna. `mcpPublisher.ts` es la implementación nueva.

import type { OnStep, PublishResult, RemoteCategory, RemoteLanguage } from "./10minutesWebsite";

export type { OnStep, PublishResult, RemoteCategory, RemoteLanguage };

export interface RemotePanel {
  id: string;
  name: string;
}

export interface AccountStatus {
  active: boolean;
  dailyLimit?: number;
  publishedToday?: number;
  remainingQuota?: number;
  imageCredits?: number;
  quotaResetsAt?: string | null;
}

export interface PublishArticleInput {
  title: string;
  categoryExternalId: string;
  disableIndexing: boolean;
  /** Panel de origen de la categoría (ver Category.panel), "" si no aplica. */
  categoryPanel?: string;
  onStep: OnStep;
  /**
   * URL pública estable de la imagen ya generada por SEO Total. Ignorada por
   * el publisher de navegador (ahí la genera el propio sitio destino), pero
   * OBLIGATORIA para el publisher MCP: el contrato de 10MWS pide `imagen_url`
   * siempre, y ese lado ya no genera ni procesa la imagen (decisión de
   * Milton, 2026-09-08) — la genera y aloja SEO Total antes de publicar.
   * Pendiente: todavía no existe en el worker un paso de "generar y alojar
   * imagen" para el flujo MCP (hoy esa generación la dispara únicamente el
   * navegador contra la IA del sitio destino); hay que decidir qué
   * generador de imágenes usar antes de conectar este publisher a un
   * servidor MCP real.
   */
  imageUrl?: string;
}

export interface UpdateArticleInput {
  title?: string;
  categoryExternalId?: string;
  disableIndexing?: boolean;
}

/**
 * Todo lo que el resto del worker necesita de "publicar en algún lado",
 * sin importar si por dentro hay un Chromium o una llamada MCP.
 */
export interface ArticlePublisher {
  fetchCategories(): Promise<RemoteCategory[]>;
  fetchLanguages?(): Promise<RemoteLanguage[]>;
  listPanels?(): Promise<RemotePanel[]>;
  publishArticle(input: PublishArticleInput): Promise<PublishResult>;
  updateArticle?(externalId: string, input: UpdateArticleInput): Promise<PublishResult>;
  deleteArticle?(externalId: string, confirmTitle: string): Promise<void>;
  getAccountStatus?(): Promise<AccountStatus>;
}
