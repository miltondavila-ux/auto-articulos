import { chromium, type Page } from "playwright";
import { buildImagePrompt, isImageRelevant } from "../imagePrompt";
import { generateFaqs, type Faq } from "../faqPrompt";

export interface TenMinutesWebsiteCredentials {
  username: string;
  password: string;
  // "net" o "site" — ver User.platformDomain. Cuentas en Europa pueden
  // vivir en 10minutesWebsite.site en vez de .net; si no se especifica,
  // se usa .net (comportamiento original, sin cambios para nadie).
  platformDomain?: string | null;
  // "es" o "en" — ver User.contentLanguage. Idioma en el que la IA debe
  // redactar el artículo, independiente del idioma de la interfaz de la
  // cuenta (ver bilingual() más abajo, que es lo que arregla los
  // selectores de botón rotos por ESE otro problema). Por defecto "es",
  // sin cambios para nadie existente.
  contentLanguage?: string | null;
}

export interface PublishResult {
  articleUrl: string | null;
  finalTitle: string;
  summary: string;
}

export interface RemoteCategory {
  externalId: string;
  name: string;
  isSequence: boolean;
}

export type OnStep = (message: string) => Promise<void>;

/**
 * Encontrado en vivo el 31/7/2026 (cuenta de Lizzammar Oropeza): el sitio
 * limita a 10 artículos por día para cuentas normales, algo que no debería
 * aplicar al programa de posicionamiento. Cuando se detecta ese mensaje
 * exacto, TODO el lote se detiene de una vez (ver queue.ts) — reintentar
 * título por título contra un límite que no se levanta hasta el día
 * siguiente solo desperdicia turnos del worker que podrían usar otros
 * usuarios, y deja al usuario adivinando por qué fallan uno por uno.
 */
export class DailyLimitReachedError extends Error {}

function resolveBaseUrl(platformDomain?: string | null): string {
  return platformDomain === "site"
    ? "https://10minuteswebsite.site"
    : "https://10minuteswebsite.net";
}

const ARTICLE_TYPE_NOTICIAS = "2";
const NAV_TIMEOUT_MS = 30_000;
const CONTENT_GENERATION_TIMEOUT_MS = 90_000;
const IMAGE_GENERATION_TIMEOUT_MS = 90_000;
const SAVE_VERIFICATION_TIMEOUT_MS = 90_000;

/**
 * Encontrado en producción el 4/8/2026: cuando la cuenta de 10minutesWebsite
 * tiene el idioma de la interfaz en inglés (no todos los usuarios la usan en
 * español), los botones de este flujo cambian de texto y los selectores por
 * texto en español dejaban de encontrarlos, colgando el artículo con
 * "Timeout ... waiting for getByRole('button', { name: 'Usar ChatGPT' })".
 * Se agregan las variantes en inglés como ALTERNATIVA, nunca como reemplazo:
 * si la traducción real en inglés del sitio no coincide exactamente con la
 * que se adivinó acá, el comportamiento para esa cuenta queda igual que
 * antes (no se rompe nada para las cuentas en español, que son la mayoría).
 */
function bilingual(...texts: string[]): RegExp {
  const escaped = texts.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(escaped.join("|"), "i");
}

const CHATGPT_MODAL_TITLE_TEXTS = [
  "Generador de artículos usando Inteligencia Artificial",
  "AI Article Generator",
  "Article Generator using Artificial Intelligence",
];
const TEXT_USAR_CHATGPT = bilingual("Usar ChatGPT", "Use ChatGPT");
const TEXT_CHATGPT_MODAL_TITLE = bilingual(...CHATGPT_MODAL_TITLE_TEXTS);
const TEXT_GENERAR = bilingual("Generar", "Generate");
const TEXT_USAR_CONTENIDO = bilingual("Usar contenido", "Use content");
const TEXT_GUARDAR_CAMBIOS = bilingual("Guardar cambios", "Save changes");
const TEXT_GENERAR_IMAGEN = bilingual("Generar imagen", "Generate image");
const TEXT_CREACION_IMAGENES = bilingual(
  "Creación de imágenes con inteligencia artificial",
  "Image creation with artificial intelligence",
  "AI image creation",
);
const TEXT_AVISO_IMAGENES_IA = bilingual(
  "Generación de imágenes mediante IA",
  "AI image generation",
);

/**
 * Automatiza la creación y publicación de un artículo en 10minutesWebsite a
 * partir de un título, usando las credenciales guardadas del usuario.
 * `onStep` se llama en cada paso relevante para poder mostrar una línea de
 * tiempo en vivo en el dashboard mientras corre.
 *
 * Flujo mapeado en vivo el 28/7/2026 junto al usuario en el dashboard real:
 * login -> /dashboard/direct-articles -> tipo "Noticias" -> "Usar ChatGPT"
 * (genera título/resumen/contenido) -> "Usar contenido" -> generar imagen con
 * IA -> "Guardar cambios".
 */
export async function publishArticle(
  credentials: TenMinutesWebsiteCredentials,
  title: string,
  categoryExternalId: string,
  disableIndexing: boolean,
  onStep: OnStep,
): Promise<PublishResult> {
  const baseUrl = resolveBaseUrl(credentials.platformDomain);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();

    await login(page, baseUrl, credentials, onStep);

    const { summary, contentHtml, finalTitle } = await createArticleDraft(
      page,
      baseUrl,
      title,
      categoryExternalId,
      disableIndexing,
      credentials.contentLanguage,
      onStep,
    );
    await generateImage(page, finalTitle, summary, onStep);
    await fillFaqWidget(page, finalTitle, summary, contentHtml, onStep);
    const articleUrl = await saveAndGetUrl(page, baseUrl, finalTitle, onStep);

    return { articleUrl, finalTitle, summary };
  } finally {
    await browser.close();
  }
}

/**
 * Lee las categorías/etiquetas reales configuradas en la cuenta del usuario,
 * para que el dashboard de Auto Artículos las ofrezca en un selector antes de
 * pegar títulos. Son específicas de cada cuenta de 10minutesWebsite.
 */
export async function fetchCategories(
  credentials: TenMinutesWebsiteCredentials,
): Promise<RemoteCategory[]> {
  const baseUrl = resolveBaseUrl(credentials.platformDomain);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await login(page, baseUrl, credentials, async () => {});

    await page.goto(`${baseUrl}/dashboard/direct-articles`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    });

    // `data-content` trae el HTML que usa el widget visual del sitio para
    // mostrar un ícono junto al nombre (ej. "<i class='fa-solid ...'></i>
    // Finanza"). Se limpia con el propio parser HTML del navegador
    // (más confiable que un regex) para quedarnos solo con el texto real.
    // `data-sequence` ("0"/"1", verificado en vivo el 5/8/2026) distingue
    // categorías regulares de categorías "de secuencia" del sitio.
    return await page.$$eval("#user_label_list_article option", (options) =>
      options
        .map((o) => {
          const opt = o as HTMLOptionElement;
          const tmp = document.createElement("div");
          tmp.innerHTML = opt.dataset.content ?? "";
          const name = (tmp.textContent ?? "").replace(/\s+/g, " ").trim();
          return {
            externalId: opt.value,
            name,
            isSequence: opt.dataset.sequence === "1",
          };
        })
        .filter((c) => c.externalId && c.name),
    );
  } finally {
    await browser.close();
  }
}

export interface RemoteLanguage {
  externalId: string;
  name: string;
}

/**
 * Lee los idiomas reales que ofrece el selector "Lucy habla diferentes
 * idiomas, selecciona el que más te guste" dentro del modal de generación
 * con IA (visto en vivo el 5/8/2026, pedido explícito del usuario: que se
 * traigan junto a las categorías en vez de asumir una lista fija).
 *
 * Es de solo lectura: abre el modal para ver el selector, pero nunca escribe
 * en el campo de la idea ni hace clic en "Generar" — se cierra el navegador
 * sin dejar ningún rastro en la cuenta real, igual que fetchCategories().
 */
export async function fetchLanguages(
  credentials: TenMinutesWebsiteCredentials,
): Promise<RemoteLanguage[]> {
  const baseUrl = resolveBaseUrl(credentials.platformDomain);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await login(page, baseUrl, credentials, async () => {});

    await page.goto(`${baseUrl}/dashboard/direct-articles`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    });

    // El botón "Usar ChatGPT" solo queda disponible con un Tipo y una
    // Categoría ya elegidos (mismo requisito que createArticleDraft) — se
    // toma la primera categoría real de la cuenta, no importa cuál, ya que
    // nunca se llega a generar ningún artículo con ella.
    await page.selectOption("#type", ARTICLE_TYPE_NOTICIAS, {
      timeout: NAV_TIMEOUT_MS,
    });
    const firstCategoryId = await page
      .locator("#user_label_list_article option")
      .first()
      .getAttribute("value");
    if (firstCategoryId) {
      await page.selectOption("#user_label_list_article", firstCategoryId);
      await page.dispatchEvent("#user_label_list_article", "change");
    }

    await page.getByRole("button", { name: TEXT_USAR_CHATGPT }).click();
    const dialog = page.locator(".modal", {
      hasText: TEXT_CHATGPT_MODAL_TITLE,
    });
    await dialog.waitFor({ state: "visible", timeout: NAV_TIMEOUT_MS });

    return await dialog
      .locator("select")
      .first()
      .locator("option")
      .evaluateAll((options) =>
        options
          .map((o) => {
            const opt = o as HTMLOptionElement;
            return {
              externalId: opt.value,
              name: (opt.textContent ?? "").trim(),
            };
          })
          .filter((l) => l.externalId && l.name),
      );
  } finally {
    await browser.close();
  }
}

async function login(
  page: Page,
  baseUrl: string,
  credentials: TenMinutesWebsiteCredentials,
  onStep: OnStep,
): Promise<void> {
  await onStep("Iniciando sesión en 10minutesWebsite...");
  await page.goto(`${baseUrl}/dashboard/start.php`, {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT_MS,
  });

  const alreadyLoggedIn = await page
    .locator('a[href="user_buyer_seller_articles.php"]')
    .isVisible()
    .catch(() => false);
  if (alreadyLoggedIn) {
    await onStep("Sesión ya activa.");
    return;
  }

  // El idioma de la pantalla de login varía según la sesión/navegador (se vio
  // en español por defecto en pruebas). Forzamos inglés con el selector de
  // idioma para que el resto de los selectores de texto sean confiables.
  const englishLink = page.getByText("en", { exact: true });
  if (await englishLink.isVisible().catch(() => false)) {
    await englishLink.click();
    await page.waitForLoadState("domcontentloaded");
  }

  await page.getByText("Using your Email + Password", { exact: true }).click();
  await page.fill('input[name="email"]', credentials.username);
  await page.fill('input[name="password"]', credentials.password);
  await page.getByRole("button", { name: "Login", exact: true }).click();

  try {
    await page.waitForSelector('a[href="user_buyer_seller_articles.php"]', {
      timeout: NAV_TIMEOUT_MS,
    });
  } catch {
    // Mensaje más claro que el timeout crudo de Playwright: esto casi
    // siempre pasa por usuario/contraseña incorrectos guardados en
    // Configuración, no por un problema del código. Si el sitio muestra
    // algún texto de error visible, se incluye también.
    const alertText = await page
      .evaluate(() => {
        const candidates = Array.from(
          document.querySelectorAll(
            '[class*="alert" i], [class*="error" i], [role="alert"]',
          ),
        ).filter((el) => (el as HTMLElement).offsetParent !== null);
        return candidates
          .map((el) => (el.textContent ?? "").trim())
          .filter((t) => t.length > 0)
          .slice(0, 3)
          .join(" | ");
      })
      .catch(() => "");
    throw new Error(
      `No se pudo iniciar sesión en 10minutesWebsite. Verifica que el usuario y la contraseña guardados en Configuración sean correctos (los mismos con los que se entra a 10minutesWebsite)${alertText ? `. Mensaje visible en el sitio: "${alertText}"` : "."}`,
    );
  }
  await onStep("Sesión iniciada correctamente.");
}

async function createArticleDraft(
  page: Page,
  baseUrl: string,
  title: string,
  categoryExternalId: string,
  disableIndexing: boolean,
  contentLanguage: string | null | undefined,
  onStep: OnStep,
): Promise<{ summary: string; contentHtml: string; finalTitle: string }> {
  await onStep("Abriendo formulario de creación de artículo...");
  await page.goto(`${baseUrl}/dashboard/direct-articles`, {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT_MS,
  });

  try {
    await page.selectOption("#type", ARTICLE_TYPE_NOTICIAS, {
      timeout: NAV_TIMEOUT_MS,
    });
  } catch {
    // Encontrado en vivo el 31/7/2026 (cuenta de Mariana Romero): si el
    // formulario no carga, es posible que el sitio esté mostrando otra
    // pantalla (ej. un aviso de límite) en vez del formulario normal, y por
    // eso nunca aparece el campo "Tipo". Mensaje explícito con la hipótesis
    // más probable, pedido por el usuario.
    const alertText = await page
      .evaluate(() => {
        const candidates = Array.from(
          document.querySelectorAll(
            '[class*="alert" i], [class*="error" i], [role="alert"]',
          ),
        ).filter((el) => (el as HTMLElement).offsetParent !== null);
        return candidates
          .map((el) => (el.textContent ?? "").trim())
          .filter((t) => t.length > 0)
          .slice(0, 3)
          .join(" | ");
      })
      .catch(() => "");

    // El sitio muestra este texto exacto (visto en vivo con la cuenta de
    // Lizzammar Oropeza) cuando el límite diario de artículos está activo.
    // Si lo detectamos, es un hecho confirmado, no una hipótesis — se marca
    // con un error especial para que TODO el lote se detenga de inmediato
    // en vez de reintentar título por título contra el mismo límite.
    if (/límite diario/i.test(alertText)) {
      throw new DailyLimitReachedError(
        `Se alcanzó el límite diario de artículos de esta cuenta en 10minutesWebsite: "${alertText}". ` +
          "Esto no debería aplicar a cuentas del programa de posicionamiento — " +
          "escribe al servicio al cliente de 10minutesWebsite " +
          "(https://www.10minuteswebsite.com/ayuda) para que eliminen esa " +
          "restricción para esta cuenta. Mientras tanto, el resto de los " +
          "artículos de este lote no se pueden crear hoy.",
      );
    }

    throw new Error(
      "No se pudo abrir el formulario de creación de artículo (el sitio no " +
        'mostró el campo "Tipo" a tiempo)' +
        (alertText ? `. Mensaje visible en el sitio: "${alertText}"` : ".") +
        " Es posible que la cuenta haya alcanzado un límite diario de " +
        "artículos en 10minutesWebsite (por ejemplo, 10 por día), algo que " +
        "no debería aplicar para cuentas del programa de posicionamiento. " +
        "Si este error se repite, solicita al servicio al cliente de " +
        "10minutesWebsite que revise y elimine esa restricción para esta " +
        "cuenta.",
    );
  }

  // #user_label_list_article es un <select multiple> reforzado visualmente
  // por un widget (se ve como combobox), pero fijar el value real y disparar
  // "change" es suficiente para que el widget se sincronice.
  await page.selectOption("#user_label_list_article", categoryExternalId);
  await page.dispatchEvent("#user_label_list_article", "change");
  await onStep("Categoría seleccionada.");

  // #activate_indexing es un checkbox real disfrazado de switch (Materialize):
  // viene marcado (indexación activada) por defecto, igual que en el sitio.
  // Se verificó en vivo que el checkbox queda con opacity:0 y width:0 (el
  // "lever" visual lo tapa), por eso hace falta "force" para des/marcarlo.
  if (disableIndexing) {
    await page
      .locator("#activate_indexing")
      .setChecked(false, { force: true })
      .catch(() => {});
    await onStep("Indexación en buscadores desactivada para este artículo.");
  }

  await page.getByRole("button", { name: TEXT_USAR_CHATGPT }).click();

  // Selector específico: la página también tiene un widget de chat en vivo
  // ("Lucy") con role="dialog" oculto, así que no basta con ".modal, [role='dialog']".
  const dialog = page.locator(".modal", {
    hasText: TEXT_CHATGPT_MODAL_TITLE,
  });
  await dialog.waitFor({ state: "visible", timeout: NAV_TIMEOUT_MS });

  // Selector real "Lucy habla diferentes idiomas, selecciona el que más te
  // guste" (visto en vivo el 5/8/2026, ver fetchLanguages()). El sitio ya lo
  // deja en español por defecto, así que solo se toca si el usuario
  // sincronizó y eligió explícitamente otro idioma en Configuración —
  // User.contentLanguage guarda el value real de esa opción, no un código
  // inventado. Si no hay sincronización (valor no coincide con ninguna
  // opción real), se deja el valor por defecto del sitio en vez de fallar
  // la publicación completa por esto.
  if (contentLanguage) {
    await dialog
      .locator("select")
      .first()
      .selectOption(contentLanguage)
      .catch(() => {});
  }

  const ideaTextarea = dialog.locator("textarea").first();
  await ideaTextarea.fill(title);

  await dialog.getByRole("button", { name: TEXT_GENERAR }).click();
  await onStep(
    "Generando contenido con inteligencia artificial (puede tardar un minuto)...",
  );

  // El generador escribe Contenido, Resumen y Título en ese orden (streaming).
  // Esperamos a que el campo Título dentro del modal tenga texto real
  // (no el placeholder "Please wait we are getting the data...").
  await page.waitForFunction(
    (titleTexts) => {
      const chatGptDialog = Array.from(
        document.querySelectorAll(".modal"),
      ).find((el) => {
        const text = el.textContent ?? "";
        return titleTexts.some((t) => text.includes(t));
      });
      if (!chatGptDialog) return false;
      const fields = Array.from(chatGptDialog.querySelectorAll("textarea"));
      const last = fields[fields.length - 1] as HTMLTextAreaElement | undefined;
      return Boolean(last && last.value && !last.value.includes("Please wait"));
    },
    CHATGPT_MODAL_TITLE_TEXTS,
    { timeout: CONTENT_GENERATION_TIMEOUT_MS },
  );
  await onStep("Contenido generado. Aplicándolo al artículo...");

  // Leemos el Contenido (HTML) aquí, mientras el modal sigue abierto, para
  // usarlo como base del FAQ que se agrega más adelante. También guardamos
  // el Título final que la IA le puso al artículo (índice 3: idea, contenido,
  // resumen, título, prompt de imagen): es justamente el que se usa después
  // para localizar el artículo ya publicado (ver findArticleByTitle).
  const contentHtml = await dialog
    .locator("textarea")
    .nth(1)
    .inputValue()
    .catch(() => "");
  const finalTitle =
    (await dialog
      .locator("textarea")
      .nth(3)
      .inputValue()
      .catch(() => "")) || title;
  await onStep(`Título asignado por la IA: "${finalTitle}"`);

  await dialog.getByRole("button", { name: TEXT_USAR_CONTENIDO }).click();
  await dialog.waitFor({ state: "hidden", timeout: NAV_TIMEOUT_MS });

  // Bug real encontrado el 29/7/2026: la IA a veces escribe el resumen por
  // encima del límite de 300 caracteres del campo #excerptes. La plataforma
  // no lanza ningún error visible para Playwright: solo deshabilita
  // "Guardar cambios" en silencio (clase "error-article"), y ese estado no
  // se revierte solo aunque se corrija el valor después — hay que corregirlo
  // ANTES de guardar.
  const excerptField = page.locator("#excerptes");
  let summary = await excerptField.inputValue().catch(() => "");
  if (summary.length >= 300) {
    summary = summary.slice(0, 280);
    await excerptField.fill(summary);
    await onStep(
      "Resumen recortado para respetar el límite de 300 caracteres de la plataforma.",
    );
  }

  return { summary, contentHtml, finalTitle };
}

const MAX_IMAGE_ATTEMPTS = 3;
const IMAGE_SECTION_RETRY_TIMEOUT_MS = 12_000;
const IMAGE_SECTION_OPEN_ATTEMPTS = 3;

/**
 * Bug real encontrado el 30/7/2026 (reproducido con varias cuentas distintas,
 * no es específico de una): el selector "button.aigenerationbutton" con texto
 * "Generar imagen" puede tener DECENAS de coincidencias en la página (el
 * artículo generado por IA incluye botones de "Generar imagen" embebidos por
 * cada bloque de contenido, además del botón de la imagen principal), y casi
 * todas están ocultas. Un solo click sobre el encabezado "Creación de
 * imágenes..." a veces no llega a abrir/mostrar el botón correcto a tiempo
 * (UI flakiness), así que reintentamos el click varias veces antes de fallar,
 * y acotamos el locator a ":visible" para no quedar esperando sobre alguno de
 * los botones ocultos de otros bloques.
 */
async function openImageSection(page: Page) {
  const generarImagenBtn = page.locator("button.aigenerationbutton:visible", {
    hasText: TEXT_GENERAR_IMAGEN,
  });

  for (let attempt = 1; attempt <= IMAGE_SECTION_OPEN_ATTEMPTS; attempt++) {
    await page
      .getByText(TEXT_CREACION_IMAGENES)
      .first()
      .click()
      .catch(() => {});

    const isLastAttempt = attempt === IMAGE_SECTION_OPEN_ATTEMPTS;
    const becameVisible = await generarImagenBtn
      .first()
      .waitFor({
        state: "visible",
        timeout: isLastAttempt
          ? NAV_TIMEOUT_MS
          : IMAGE_SECTION_RETRY_TIMEOUT_MS,
      })
      .then(() => true)
      .catch(() => false);
    if (becameVisible) break;
  }

  return generarImagenBtn.first();
}

const IMAGE_DISCLAIMER_CHECK_TIMEOUT_MS = 4_000;

/**
 * Reportado por el usuario el 30/7/2026 (con captura real): la PRIMERA vez
 * que una cuenta de 10minutesWebsite usa el generador de imágenes con IA (o
 * cada ~15 días si no se marca "no mostrar"), aparece un modal de aviso
 * ("Generación de imágenes mediante IA") que bloquea la página hasta que se
 * acepta. Muy probablemente esto explica los cuelgues vistos antes al
 * intentar interactuar con "Generar imagen" (el botón deja de ser
 * ":visible" mientras el modal está abierto). Si aparece, hay que marcar
 * "No mostrar este mensaje durante 15 días" y aceptar con "OK"; si por
 * algún motivo no se puede, no seguimos adivinando — se informa el motivo
 * real al usuario en vez de fallar con un error genérico de timeout.
 */
async function dismissImageGenerationDisclaimer(
  page: Page,
  onStep: OnStep,
): Promise<void> {
  const dialog = page.locator(".modal", {
    hasText: TEXT_AVISO_IMAGENES_IA,
  });
  const appeared = await dialog
    .first()
    .waitFor({ state: "visible", timeout: IMAGE_DISCLAIMER_CHECK_TIMEOUT_MS })
    .then(() => true)
    .catch(() => false);
  if (!appeared) return;

  const checkedOk = await dialog
    .locator('input[type="checkbox"]')
    .first()
    .check({ force: true })
    .then(() => true)
    .catch(() => false);

  const clickedOk = await dialog
    .getByRole("button", { name: "OK" })
    .first()
    .click({ force: true })
    .then(() => true)
    .catch(() => false);

  await dialog
    .first()
    .waitFor({ state: "hidden", timeout: NAV_TIMEOUT_MS })
    .catch(() => {});

  if (!checkedOk || !clickedOk) {
    throw new Error(
      "Apareció el aviso 'Generación de imágenes mediante IA' de 10minutesWebsite y no se pudo cerrar (marcar 'No mostrar este mensaje durante 15 días' y aceptar 'OK'); no se pudo continuar con la generación de la imagen.",
    );
  }
  await onStep(
    "Aviso de 'Generación de imágenes mediante IA' de 10minutesWebsite cerrado (no volverá a salir por 15 días).",
  );
}

async function generateImage(
  page: Page,
  title: string,
  summary: string,
  onStep: OnStep,
): Promise<void> {
  await onStep(
    "Generando imagen con inteligencia artificial (puede tardar un minuto)...",
  );
  await dismissImageGenerationDisclaimer(page, onStep);
  const generarImagenBtn = await openImageSection(page);
  await dismissImageGenerationDisclaimer(page, onStep);

  for (let attempt = 1; attempt <= MAX_IMAGE_ATTEMPTS; attempt++) {
    // #images es el textarea real que lee "Generar imagen" (verificado en
    // vivo el 29/7/2026): escribimos ahí nuestro propio prompt, basado en el
    // título y resumen reales, justo antes de generar.
    const prompt = buildImagePrompt(summary);
    await page
      .locator("#images")
      .fill(prompt, { force: true })
      .catch(() => {});

    // Bug real encontrado el 30/7/2026: aunque openImageSection() ya
    // confirmó que el botón está visible, para cuando llegamos a hacer clic
    // (justo después de escribir en #images) a veces vuelve a quedar oculto
    // un instante (visibilidad inestable en esta sección), y el click normal
    // agota su espera de actionability. Usamos "force" para no depender de
    // que siga visible/estable en ese instante exacto.
    await generarImagenBtn.scrollIntoViewIfNeeded().catch(() => {});
    await generarImagenBtn.click({ force: true });
    await dismissImageGenerationDisclaimer(page, onStep);

    // La generación de imagen es asíncrona: hay que esperar a que aparezca la
    // vista previa dentro del recorte de foto antes de continuar.
    try {
      await page.waitForSelector('img[alt="Preview"]', {
        state: "attached",
        timeout: IMAGE_GENERATION_TIMEOUT_MS,
      });
      await page.waitForFunction(
        () => {
          const preview = document.querySelector(
            'img[alt="Preview"]',
          ) as HTMLImageElement | null;
          return Boolean(preview && preview.naturalWidth > 0);
        },
        undefined,
        { timeout: IMAGE_GENERATION_TIMEOUT_MS },
      );
    } catch (err) {
      // Reportado por el usuario el 31/7/2026: cuando la generación de
      // imagen nunca aparece dentro del tiempo esperado, una causa posible
      // es que se hayan agotado los tokens/créditos de generación de
      // imágenes de la cuenta en 10minutesWebsite (no hay un mensaje de
      // error visible para distinguirlo de una demora normal, así que se
      // deja como una posibilidad a considerar en vez de un diagnóstico
      // certero).
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `${message} — es posible que se hayan acabado los tokens de generación de imágenes de la cuenta en 10minutesWebsite.`,
      );
    }

    const relevant = await checkPreviewRelevant(page, title, summary);
    if (relevant || attempt === MAX_IMAGE_ATTEMPTS) {
      await confirmImageCrop(page);
      await onStep(
        attempt === 1
          ? "Imagen generada."
          : `Imagen generada (intento ${attempt} de ${MAX_IMAGE_ATTEMPTS}).`,
      );
      return;
    }
    await onStep(
      `La imagen no parece corresponder al tema del artículo, generando una nueva (intento ${attempt + 1} de ${MAX_IMAGE_ATTEMPTS})...`,
    );
  }
}

/**
 * Detectado el 30/7/2026 en la cuenta de otro usuario (Broward County Real
 * Estate): en algunas cuentas, la plataforma exige "confirmar" el recorte de
 * la imagen (mover el control de Zoom) antes de permitir guardar, aunque la
 * imagen generada por IA ya se haya cargado en la vista previa — si no, al
 * hacer clic en "Guardar cambios" aparece un popup de error ("You must load
 * and crop an image for the optimized method") que bloquea el guardado en
 * silencio para Playwright. No se vio este requisito en la cuenta original
 * donde se mapeó el flujo, así que aquí solo se "toca" el control de Zoom
 * (si existe y es visible) para registrar el recorte como confirmado; si no
 * existe o falla, no se bloquea el artículo.
 */
async function confirmImageCrop(page: Page): Promise<void> {
  // Intento 1 (30/7/2026, primera versión): mover el slider de Zoom con
  // eventos sintéticos. Confirmado con evidencia real que NO funciona — el
  // popup de error sigue apareciendo igual. La librería de recorte
  // probablemente solo actualiza su estado interno con un arrastre real del
  // mouse sobre la imagen, no con eventos "input"/"change" sintéticos.
  // Intento 2: simular ese arrastre real con page.mouse sobre la vista
  // previa de la imagen. Se mantiene también el intento 1 por si acaso,
  // ninguno de los dos bloquea el artículo si falla.
  try {
    const cropImage = page.locator('img[alt="Preview"]').first();
    const box = await cropImage.boundingBox();
    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + 20, centerY + 20, { steps: 8 });
      await page.mouse.move(centerX, centerY, { steps: 8 });
      await page.mouse.up();
    }
  } catch {
    // no bloqueamos el artículo si esto falla
  }

  await page
    .evaluate(() => {
      const sliders = Array.from(
        document.querySelectorAll('input[type="range"]'),
      ) as HTMLInputElement[];
      for (const el of sliders) {
        if (el.offsetParent === null) continue;
        const step = Number(el.step) || 1;
        const original = el.value;
        const nudged = String(Number(el.value) + step);
        el.value = nudged;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.value = original;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })
    .catch(() => {});
}

/**
 * Descarga la imagen de vista previa y le pregunta a un modelo con visión
 * (ver imagePrompt.ts) si corresponde al tema. Si algo falla al descargarla
 * o al consultar la IA, se acepta la imagen sin bloquear el artículo — es
 * una validación adicional, no un requisito para publicar.
 */
async function checkPreviewRelevant(
  page: Page,
  title: string,
  summary: string,
): Promise<boolean> {
  try {
    const src = await page.getAttribute('img[alt="Preview"]', "src");
    if (!src) return true;
    const response = await page.request.get(src);
    if (!response.ok()) return true;
    const buffer = await response.body();
    return await isImageRelevant(buffer.toString("base64"), title, summary);
  } catch {
    return true;
  }
}

/**
 * Genera preguntas frecuentes reales con IA a partir del título y el
 * contenido real generado para el artículo (ver faqPrompt.ts), y coloca el
 * schema.org FAQPage en el campo "Widget (opcional)" (#widgetcode) al pie
 * del formulario. Es un textarea de texto libre sin validaciones (verificado
 * en vivo el 29/7/2026: escribir aquí no afecta el guardado del artículo, a
 * diferencia del campo de imagen).
 *
 * Pedido explícito del usuario (31/7/2026): el FAQ debe quedar SOLO en el
 * código (para SEO) y no debe verse nada en la página.
 *
 * Bug de plataforma encontrado el 1/8/2026 (Google Search Console marcaba
 * "Detectados errores de sintaxis en los datos estructurados" en todos los
 * artículos): confirmado con evidencia directa que 10minutesWebsite
 * convierte TODAS las comillas dobles en comillas simples al GUARDAR el
 * campo Widget — incluso el propio atributo `type="application/ld+json"`
 * del script terminaba con comillas simples. Como JSON exige comillas
 * dobles literales sin excepción, esto invalidaba el schema sin importar
 * cómo se armara el JSON. Ver buildFaqSchema() para la solución.
 */
async function fillFaqWidget(
  page: Page,
  title: string,
  summary: string,
  contentHtml: string,
  onStep: OnStep,
): Promise<void> {
  const plainContent = stripHtml(contentHtml);
  const faqs = await generateFaqs(title, summary, plainContent);

  if (faqs.length === 0) {
    await onStep(
      "No se generaron preguntas frecuentes de calidad para este artículo; se omite el FAQ.",
    );
    return;
  }

  const widgetHtml = buildFaqSchema(faqs);
  await page.fill("#widgetcode", widgetHtml);
  await onStep(
    `Preguntas frecuentes (FAQ) generadas con IA a partir del contenido real (${faqs.length}).`,
  );
}

/**
 * En vez de mandar el JSON-LD directo (que 10minutesWebsite invalida
 * convirtiendo sus comillas dobles en simples al guardar), esto genera un
 * <script> de JavaScript normal y EJECUTABLE que arma el schema con
 * JSON.stringify() en el navegador y lo inyecta como
 * <script type="application/ld+json"> nuevo en el <head> en tiempo de
 * ejecución. JavaScript no distingue comilla simple/doble/invertida para
 * sus propios string literals, así que la conversión de comillas de
 * 10minutesWebsite no rompe nada — y JSON.stringify() siempre produce JSON
 * con comillas dobles correctas sin importar cómo estaba escrito el código
 * fuente que lo generó. Googlebot ejecuta JavaScript al rastrear y sí
 * recoge JSON-LD inyectado dinámicamente al DOM (patrón oficialmente
 * soportado por Google, no un truco). Probado en vivo el 1/8/2026 en un
 * artículo real: Google Search Console ya no marca error.
 *
 * El texto de cada pregunta/respuesta va entre backticks (template
 * literals); se escapan backslashes, backticks y `${` por si el contenido
 * generado por IA llegara a incluir alguno de esos caracteres.
 */
function buildFaqSchema(faqs: Faq[]): string {
  const pairsJs = faqs
    .map(
      (f) =>
        `[\`${escapeForTemplateLiteral(f.q)}\`, \`${escapeForTemplateLiteral(f.a)}\`]`,
    )
    .join(",\n    ");

  return `<script>
(function(){
  var faqs = [
    ${pairsJs}
  ];
  var schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(function(pair){
      return {
        '@type': 'Question',
        name: pair[0],
        acceptedAnswer: { '@type': 'Answer', text: pair[1] }
      };
    })
  };
  var s = document.createElement('script');
  s.type = 'application/ld+json';
  s.text = JSON.stringify(schema);
  document.head.appendChild(s);
})();
</script>`;
}

function escapeForTemplateLiteral(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface ArticleRow {
  id: string;
  num: number;
  href: string | null;
}

/**
 * El listado normalmente ordena por más reciente primero, PERO se verificó
 * en vivo el 30/7/2026 que el orden de esa tabla puede quedar "pegado" en
 * otro criterio (estado persistido del lado del sitio), haciendo que la
 * primera fila NO sea la más nueva. Por eso no confiamos en la posición de
 * la fila: recorremos las filas visibles y nos quedamos con el N° de
 * artículo más alto, que es el único dato realmente monótono.
 */
async function getNewestRow(listPage: Page): Promise<ArticleRow | null> {
  const rows = listPage.locator("table tbody tr");
  const count = await rows.count();
  let best: ArticleRow | null = null;
  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const idText = (
      await row
        .locator("td")
        .first()
        .innerText()
        .catch(() => "")
    ).trim();
    const num = Number.parseInt(idText, 10);
    if (Number.isNaN(num)) continue;
    if (!best || num > best.num) {
      const href = await row
        .locator("a.consultar")
        .first()
        .getAttribute("href")
        .catch(() => null);
      best = { id: idText, num, href };
    }
  }
  return best;
}

/**
 * Busca el artículo por el título REAL que la IA le asignó (guardado antes
 * de guardar el formulario), usando el buscador del propio listado en vez de
 * confiar en la posición o el N° de fila. Usamos la API de DataTables por
 * `page.evaluate` en vez de escribir en el input de búsqueda: se verificó en
 * vivo que asignar el valor y disparar eventos de teclado no siempre activa
 * el filtro de DataTables de forma confiable, mientras que llamar a su API
 * (`.search().draw()`) sí funciona siempre. Si la búsqueda encuentra más de
 * una fila (por ejemplo coincidencias parciales), nos quedamos con el N° de
 * artículo más alto entre los resultados filtrados.
 */
async function findArticleByTitle(
  page: Page,
  title: string,
): Promise<string | null> {
  await page.evaluate((searchText) => {
    const jq = (
      window as unknown as {
        jQuery?: (s: string) => {
          DataTable: () => { search: (s: string) => { draw: () => void } };
        };
      }
    ).jQuery;
    jq?.("table").DataTable().search(searchText).draw();
  }, title);
  await page.waitForTimeout(800);

  const row = await getNewestRow(page);
  return row?.href ?? null;
}

async function saveAndGetUrl(
  page: Page,
  baseUrl: string,
  expectedTitle: string,
  onStep: OnStep,
): Promise<string | null> {
  await onStep("Guardando y publicando el artículo...");
  const saveBtn = page.getByRole("button", { name: TEXT_GUARDAR_CAMBIOS }).first();
  await saveBtn.click();
  await page
    .waitForLoadState("networkidle", { timeout: NAV_TIMEOUT_MS })
    .catch(() => {});

  // Diagnóstico: se han visto fallos repetidos de guardado SOLO en la
  // ejecución automatizada (nunca al reproducir el mismo flujo a mano), sin
  // ninguna pista visible en el log de texto. La primera vez que se capturó
  // esto (30/7/2026), la captura mostró que seguíamos en el formulario de
  // edición (no se redirigió a la lista) apenas ~1s después del clic —
  // sospecha de que el clic no disparó el guardado real o de que hay algún
  // mensaje de error fuera del viewport. Por eso: página completa + estado
  // real del botón + cualquier texto tipo alerta/error visible en ese
  // momento, como evento normal (no error) para verlo en el Historial.
  const stillOnForm = await page
    .getByRole("button", { name: TEXT_GUARDAR_CAMBIOS })
    .first()
    .isVisible()
    .catch(() => false);
  const buttonDisabled = await saveBtn.isDisabled().catch(() => null);
  const alertText = await page
    .evaluate(() => {
      const candidates = Array.from(
        document.querySelectorAll(
          '[class*="alert" i], [class*="error" i], [class*="toast" i], [role="alert"]',
        ),
      ).filter((el) => (el as HTMLElement).offsetParent !== null);
      return candidates
        .map((el) => (el.textContent ?? "").trim())
        .filter((t) => t.length > 0)
        .slice(0, 5)
        .join(" | ");
    })
    .catch(() => "");
  await onStep(
    `Diagnóstico de guardado: sigue en el formulario=${stillOnForm}, botón deshabilitado=${buttonDisabled}, mensajes visibles="${alertText}"`,
  );
  // Bug de consumo de datos encontrado el 30/7/2026: esta captura se estaba
  // guardando SIEMPRE, incluso cuando el artículo se publica bien (que es el
  // caso normal). Cada captura pesa cientos de KB en base64, y el dashboard
  // la vuelve a transferir cada vez que alguien mira el progreso en vivo o el
  // historial — eso agotó la cuota gratuita de transferencia de Neon. Ahora
  // se captura en memoria pero solo se guarda en la base de datos si
  // realmente no se encuentra el artículo después (más abajo).
  const postSaveScreenshot = await captureScreenshotBase64(page);

  // Localizamos el artículo por el título real que la IA le asignó (guardado
  // en createArticleDraft), no por posición de fila ni por comparar N° antes
  // vs. después: se pidió explícitamente localizarlo así.
  await onStep(
    `Buscando el artículo publicado por su título: "${expectedTitle}"...`,
  );
  const deadline = Date.now() + SAVE_VERIFICATION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await page.goto(`${baseUrl}/dashboard/user_buyer_seller_articles.php`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    });
    const href = await findArticleByTitle(page, expectedTitle);
    if (href) return href;
    await page.waitForTimeout(1500);
  }

  // No se encontró dentro del plazo: recién aquí vale la pena guardar la
  // captura de justo después de guardar, más una última del listado tal
  // como quedó, para diagnosticar sin adivinar.
  if (postSaveScreenshot) {
    await onStep(
      `DIAGNÓSTICO [Estado justo después de hacer clic en Guardar cambios]: data:image/jpeg;base64,${postSaveScreenshot}`,
    );
  }
  await emitScreenshot(
    page,
    "Listado de artículos al agotarse el plazo de búsqueda",
    onStep,
  );
  return null;
}

async function captureScreenshotBase64(page: Page): Promise<string | null> {
  const buffer = await page
    .screenshot({ type: "jpeg", quality: 40, fullPage: true })
    .catch(() => null);
  return buffer ? buffer.toString("base64") : null;
}

async function emitScreenshot(
  page: Page,
  label: string,
  onStep: OnStep,
): Promise<void> {
  const base64 = await captureScreenshotBase64(page);
  if (!base64) return;
  await onStep(`DIAGNÓSTICO [${label}]: data:image/jpeg;base64,${base64}`);
}
