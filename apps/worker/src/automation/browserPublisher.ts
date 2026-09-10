// Adaptador de la línea de ejecución EXISTENTE (navegador/Playwright) a la
// interfaz común `ArticlePublisher` (2026-09-07/08, "MCP 10MWS").
//
// No cambia ni una línea de `10minutesWebsite.ts`: solo envuelve sus
// funciones ya probadas en producción para que `queue.ts` pueda elegir entre
// esta línea y la nueva de MCP sin ramificar su propia lógica.

import {
  fetchCategories,
  fetchLanguages,
  publishArticle,
  type TenMinutesWebsiteCredentials,
} from "./10minutesWebsite";
import type { ArticlePublisher, PublishArticleInput, PublishResult, RemoteCategory, RemoteLanguage } from "./publisher";

export function createBrowserPublisher(
  credentials: TenMinutesWebsiteCredentials,
): ArticlePublisher {
  return {
    fetchCategories(): Promise<RemoteCategory[]> {
      return fetchCategories(credentials);
    },
    fetchLanguages(): Promise<RemoteLanguage[]> {
      return fetchLanguages(credentials);
    },
    publishArticle(input: PublishArticleInput): Promise<PublishResult> {
      return publishArticle(
        credentials,
        input.title,
        input.categoryExternalId,
        input.disableIndexing,
        input.onStep,
        input.categoryPanel ?? "",
      );
    },
  };
}
