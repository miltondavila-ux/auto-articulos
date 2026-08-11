import {
  chromium,
  type Page,
  type Response as PlaywrightResponse,
} from "playwright";
import { buildImagePrompt, isImageRelevant } from "../imagePrompt";
import { generateFaqs, type Faq } from "../faqPrompt";
import { translateText } from "../translateText";
import { replacePhonePlaceholders } from "../phonePlaceholders";

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
  // Texto propio del usuario (ver User.articleSignature) que se agrega al
  // final del contenido de CADA artículo nuevo, antes de guardar — pedido
  // explícito del usuario, 6/8/2026. Null/vacío = no se agrega nada.
  articleSignature?: string | null;
  // Teléfono del usuario para reemplazar marcadores "PHONE_NUMBER" de WhatsApp/llamada
  userPhone?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
      credentials.articleSignature,
      credentials.userPhone,
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
  articleSignature: string | null | undefined,
  userPhone: string | null | undefined,
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
    const languageSelect = dialog.locator("select").first();
    await languageSelect.selectOption(contentLanguage).catch(() => {});
    // Bug real encontrado el 6/8/2026 (cuenta de Gustavo Torres, contentLanguage
    // en inglés): a diferencia del selector de categoría (#user_label_list_article),
    // este también parece estar reforzado por un widget visual que necesita el
    // evento "change" disparado a mano para sincronizarse de verdad — sin esto,
    // la generación de contenido se quedaba colgada 90s sin producir nada
    // (page.waitForFunction timeout), probablemente porque el sitio nunca
    // terminaba de aplicar el cambio de idioma antes de "Generar". Mismo
    // tratamiento que ya funciona para la categoría.
    await dialog.locator("select").first().dispatchEvent("change").catch(() => {});
    const appliedLanguage = await languageSelect.inputValue().catch(() => "");
    await onStep(
      appliedLanguage === contentLanguage
        ? `Idioma del contenido aplicado: ${appliedLanguage}.`
        : `Aviso: no se pudo confirmar el idioma seleccionado (se esperaba "${contentLanguage}", quedó en "${appliedLanguage}"). Se continúa igual.`,
    );
  }

  const ideaTextarea = dialog.locator("textarea").first();
  await ideaTextarea.fill(title);

  await dialog.getByRole("button", { name: TEXT_GENERAR }).click();
  await onStep(
    "Generando contenido con inteligencia artificial (puede tardar un minuto)...",
  );

  // El generador escribe Contenido, Resumen y Título en ese orden (streaming).
  // Esperamos a que el campo Título (índice 3: idea, contenido, resumen,
  // título, prompt de imagen) tenga texto real, no el placeholder
  // "Please wait we are getting the data...".
  //
  // Bug real encontrado el 7/8/2026 (cuentas de Gustavo Torres y Svetlana, ambas
  // con contentLanguage distinto de español): esta espera NO usaba el locator
  // `dialog` de Playwright, sino que reimplementaba la búsqueda del modal a mano
  // dentro del navegador (`document.querySelectorAll(".modal")` + comparación
  // exacta de textos contra CHATGPT_MODAL_TITLE_TEXTS). Esa búsqueda casera no
  // ubicaba el modal en esas cuentas, así que la condición devolvía `false` para
  // siempre y la espera se agotaba aunque el artículo YA estuviera generado.
  //
  // Evidencia directa, del log de producción del 7/8/2026: en el mismo instante
  // del timeout, el volcado de diagnóstico —que sí usa el locator `dialog`— leyó
  // los cinco campos completos y correctos (contenido de 5958 chars, resumen,
  // título "Navigating Home Buying in Baja California", prompt de imagen). Mismo
  // momento, dos resultados opuestos: el que fallaba era el buscador casero. Los
  // fallos clavados exactamente en el límite (tres veces a 90s y, con el límite
  // subido, tres veces a 180000ms) confirman que la condición nunca podía
  // volverse verdadera; no era lentitud del sitio ni del idioma.
  //
  // Ahora se sondea el campo a través del MISMO locator `dialog` que ya se usa
  // en todo el resto de la función (y que el diagnóstico demostró que funciona),
  // en vez de duplicar la lógica de búsqueda con selectores crudos.
  const titleField = dialog.locator("textarea").nth(3);
  const generationDeadline = Date.now() + CONTENT_GENERATION_TIMEOUT_MS;
  let contentGenerated = false;
  while (Date.now() < generationDeadline) {
    const value = await titleField.inputValue().catch(() => "");
    if (value && !value.includes("Please wait")) {
      contentGenerated = true;
      break;
    }
    await page.waitForTimeout(1000);
  }

  if (!contentGenerated) {
    // Si de verdad se agota el tiempo, no dejamos un timeout ciego: volcamos el
    // estado real de cada campo del modal para saber qué llegó a escribir el
    // sitio y qué no, en vez de tener que adivinar con la siguiente corrida.
    const fieldsState = await dialog
      .locator("textarea")
      .evaluateAll((nodes) =>
        nodes.map((n, i) => {
          const value = (n as HTMLTextAreaElement).value ?? "";
          return `#${i}: ${value.length} chars${
            value ? ` — "${value.slice(0, 60).replace(/\s+/g, " ")}"` : " (vacío)"
          }`;
        }),
      )
      .catch(() => [] as string[]);
    await onStep(
      `DIAGNÓSTICO [estado de los campos del modal al agotarse la espera]: ${
        fieldsState.length ? fieldsState.join(" | ") : "no se pudieron leer"
      }`,
    );
    throw new Error(
      `El sitio no terminó de generar el contenido en ${
        CONTENT_GENERATION_TIMEOUT_MS / 1000
      }s (el campo Título del modal siguió vacío).`,
    );
  }
  await onStep("Contenido generado. Aplicándolo al artículo...");

  // Leemos el Contenido (HTML) aquí, mientras el modal sigue abierto, para
  // usarlo como base del FAQ que se agrega más adelante. También guardamos
  // el Título final que la IA le puso al artículo (índice 3: idea, contenido,
  // resumen, título, prompt de imagen): es justamente el que se usa después
  // para localizar el artículo ya publicado (ver findArticleByTitle).
  let contentHtml = await dialog
    .locator("textarea")
    .nth(1)
    .inputValue()
    .catch(() => "");

  if (contentHtml.includes("PHONE_NUMBER")) {
    if (userPhone) {
      const repaired = replacePhonePlaceholders(contentHtml, userPhone);
      contentHtml = repaired.html;
      const contentField = dialog.locator("textarea").nth(1);
      await contentField.evaluate((el) => {
        el.removeAttribute("disabled");
        el.removeAttribute("readonly");
      });
      await contentField.fill(contentHtml).catch(() => {});
      await onStep(
        `✓ Marcador 'PHONE_NUMBER' reemplazado: ${repaired.replacements.whatsapp} enlace(s) de WhatsApp/QR, ${repaired.replacements.call} de llamada y ${repaired.replacements.other} uso(s) adicional(es).`,
      );
    } else {
      await onStep("⚠️ ADVERTENCIA CRÍTICA: Se detectó el marcador de posición 'PHONE_NUMBER' (botones de WhatsApp o llamada) en el artículo generado, pero NO tienes un número de teléfono configurado en tu perfil. El artículo se publicará con 'PHONE_NUMBER'.");
    }
  }

  const finalTitle =
    (await dialog
      .locator("textarea")
      .nth(3)
      .inputValue()
      .catch(() => "")) || title;
  await onStep(`Título asignado por la IA: "${finalTitle}"`);

  // Firma/aviso propio del usuario (User.articleSignature): se agrega al
  // final del contenido ANTES de hacer clic en "Usar contenido", para que
  // la plataforma lo transfiera junto con el resto del contenido generado
  // al editor real — así no hace falta ubicar/tocar el editor real, que no
  // conocemos con certeza (podría ser un WYSIWYG distinto a un textarea).
  //
  // Bug real encontrado el 7/8/2026 (cuenta de Svetlana Botnarciuc, la primera
  // con texto propio configurado que llegó hasta aquí): el sitio deja ese
  // textarea (`#respose_content`) con el atributo `disabled`, así que el `fill`
  // se pasaba 30s esperando a que fuera editable y terminaba lanzando —
  // **abortando el artículo completo por un añadido cosmético**. Dos arreglos:
  // se le quita el `disabled`/`readonly` antes de escribir, y pase lo que pase
  // este paso ya nunca tumba la publicación: si no se puede agregar el texto,
  // se avisa en el log y el artículo sigue su curso sin él.
  const trimmedSignature = articleSignature?.trim();
  if (trimmedSignature) {
    // Pedido explícito del usuario (7/8/2026): ese texto debe salir en el mismo
    // idioma del artículo. Antes se pegaba tal cual, así que un artículo entero
    // en rumano terminaba con un párrafo en español. Si la traducción falla o
    // el idioma es español, translateText() devuelve el texto original — nunca
    // bloquea ni deja el artículo sin firma por este motivo.
    const signatureText = await translateText(trimmedSignature, contentLanguage);
    if (signatureText !== trimmedSignature) {
      await onStep("Tu texto propio fue traducido al idioma del artículo.");
    }

    const contentField = dialog.locator("textarea").nth(1);
    const signatureError = await contentField
      .evaluate((el) => {
        el.removeAttribute("disabled");
        el.removeAttribute("readonly");
      })
      .then(() =>
        contentField.fill(
          `${contentHtml}\n<p>${escapeHtml(signatureText)}</p>`,
          { timeout: NAV_TIMEOUT_MS },
        ),
      )
      .then(() => null)
      .catch((e: unknown) => (e instanceof Error ? e.message : String(e)));

    await onStep(
      signatureError
        ? `Aviso: no se pudo agregar tu texto propio al final del artículo (${signatureError.slice(0, 120)}). El artículo se publica igual, sin ese texto.`
        : "Texto propio agregado al final del artículo.",
    );
  }

  await dialog.getByRole("button", { name: TEXT_USAR_CONTENIDO }).click();
  await dialog.waitFor({ state: "hidden", timeout: NAV_TIMEOUT_MS });

  // Bug encontrado el 11/8/2026 (cuenta de Lorena Álvarez): en algunas cuentas,
  // "Usar contenido" transfiere el texto del modal al editor visual (WYSIWYG)
  // pero el campo subyacente del contenido queda vacío o el editor no sincroniza
  // correctamente, dejando el botón "Guardar cambios" deshabilitado con el mensaje
  // "Este campo es obligatorio". Verificamos que el editor tenga contenido real
  // y, si no, lo inyectamos directamente vía JavaScript.
  const contentReady = await verifyAndFixContentEditor(page, contentHtml);
  await onStep(
    contentReady
      ? "Contenido transferido correctamente al editor."
      : "Aviso: no se pudo verificar el contenido del editor; se intenta guardar igual.",
  );

  // Bug real encontrado el 29/7/2026: la IA a veces escribe el resumen por
  // encima del límite de 300 caracteres del campo #excerptes. La plataforma
  // no lanza ningún error visible para Playwright: solo deshabilita
  // "Guardar cambios" en silencio (clase "error-article"), y ese estado no
  // se revierte solo aunque se corrija el valor después — hay que corregirlo
  // ANTES de guardar.
  //
  // El id de este campo NO es igual en todas las cuentas: `#excerptes` es el de
  // las cuentas donde se mapeó el flujo, pero en la de Gustavo Torres el campo
  // real es `#excerpt` (confirmado el 7/8/2026 con el volcado de diagnóstico).
  // Con el id equivocado, `inputValue()` fallaba, el resumen quedaba en cadena
  // vacía y el recorte de 300 nunca se aplicaba: en un intento real se vio el
  // campo con 308 caracteres, o sea por encima del límite que deshabilita
  // "Guardar cambios" en silencio. Además ese resumen vacío se arrastraba al
  // prompt de la imagen y al FAQ. Se busca por ids conocidos y, si ninguno
  // está, por un campo cuyo id/name hable de resumen.
  const excerptSelector = await page
    .evaluate(() => {
      for (const id of ["#excerptes", "#excerpt"]) {
        if (document.querySelector(id)) return id;
      }
      const candidate = Array.from(
        document.querySelectorAll("textarea, input[type=text]"),
      ).find((el) => {
        const field = el as HTMLInputElement;
        return (
          /excerpt|resumen/i.test(field.id) ||
          /excerpt|resumen/i.test(field.name ?? "")
        );
      });
      if (!candidate) return null;
      candidate.setAttribute("data-auto-articulos-excerpt", "1");
      return '[data-auto-articulos-excerpt="1"]';
    })
    .catch(() => null);

  let summary = "";
  if (!excerptSelector) {
    await onStep(
      "Aviso: no se encontró el campo de resumen en el formulario; se continúa sin recortarlo.",
    );
  } else {
    const excerptField = page.locator(excerptSelector);
    summary = await excerptField.inputValue().catch(() => "");
    if (summary.length >= 300) {
      summary = summary.slice(0, 280);
      await excerptField.fill(summary);
      await onStep(
        "Resumen recortado para respetar el límite de 300 caracteres de la plataforma.",
      );
    }
  }

  return { summary, contentHtml, finalTitle };
}

async function verifyAndFixContentEditor(
  page: Page,
  contentHtml: string,
): Promise<boolean> {
  try {
    const result = await page.evaluate((html) => {
      // Estrategia 1: TinyMCE
      const tinymce = (window as unknown as { tinymce?: {
        editors?: Array<{ id: string; getContent: () => string; setContent: (h: string) => void }>;
      } }).tinymce;
      if (tinymce?.editors?.length) {
        for (const ed of tinymce.editors) {
          if (!ed.getContent || !ed.setContent) continue;
          const cur = ed.getContent() || "";
          if (cur.replace(/<[^>]+>/g, "").trim().length < 100) {
            ed.setContent(html);
          }
          const after = ed.getContent() || "";
          return { ok: after.replace(/<[^>]+>/g, "").trim().length > 100, editor: `tinymce:${ed.id}` };
        }
      }

      // Estrategia 2: CKEditor
      const ckeditor = (window as unknown as { CKEDITOR?: {
        instances?: Record<string, { getData: () => string; setData: (h: string) => void }>;
      } }).CKEDITOR;
      if (ckeditor?.instances) {
        for (const key of Object.keys(ckeditor.instances)) {
          const inst = ckeditor.instances[key];
          if (!inst.getData || !inst.setData) continue;
          const cur = inst.getData() || "";
          if (cur.replace(/<[^>]+>/g, "").trim().length < 100) {
            inst.setData(html);
          }
          const after = inst.getData() || "";
          return { ok: after.replace(/<[^>]+>/g, "").trim().length > 100, editor: `ckeditor:${key}` };
        }
      }

      // Estrategia 3: textarea o contenteditable con id/name que indique contenido
      // (incluye "contentes", "content", "contenido", "cuerpo", "body", "article", "editor")
      const candidates = Array.from(
        document.querySelectorAll("textarea, [contenteditable='true']"),
      ) as (HTMLTextAreaElement | HTMLElement)[];

      const isContentField = (id: string, name: string): boolean => {
        return /content|contenido|cuerpo|body|article|editor|materia|principal|text/i.test(id) ||
               /content|contenido|cuerpo|body|article|editor|materia|principal|text/i.test(name);
      };

      for (const el of candidates) {
        const id = (el.id || "").toLowerCase();
        const name = ((el as HTMLTextAreaElement).name || "").toLowerCase();
        if (!isContentField(id, name)) continue;

        const isTextarea = el.tagName === "TEXTAREA";
        const current = isTextarea
          ? (el as HTMLTextAreaElement).value || ""
          : (el as HTMLElement).innerHTML || "";

        if (current.replace(/<[^>]+>/g, "").trim().length < 100) {
          if (isTextarea) {
            (el as HTMLTextAreaElement).value = html;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          } else {
            (el as HTMLElement).innerHTML = html;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }

        const after = isTextarea
          ? (el as HTMLTextAreaElement).value || ""
          : (el as HTMLElement).innerHTML || "";
        return { ok: after.replace(/<[^>]+>/g, "").trim().length > 100, editor: `${el.tagName}#${id || name}` };
      }

      // Estrategia 4: buscar cualquier textarea vacío que sea grande (campo principal)
      const allTextareas = Array.from(document.querySelectorAll("textarea")) as HTMLTextAreaElement[];
      for (const ta of allTextareas) {
        if (ta.value.length > 100) continue; // Ya tiene contenido
        if (ta.offsetParent === null && ta.style.display === "none") continue; // Oculto real
        // Si es un textarea grande (rows > 5) y está vacío, probablemente es el contenido principal
        if ((ta.rows > 5 || ta.style.height !== "" || ta.className.includes("editor")) && ta.value.length < 100) {
          ta.value = html;
          ta.dispatchEvent(new Event("input", { bubbles: true }));
          ta.dispatchEvent(new Event("change", { bubbles: true }));
          return { ok: (ta.value?.length ?? 0) > 100, editor: `textarea:${ta.id || ta.name || "unknown"}` };
        }
      }

      // Estrategia 5: buscar en iframes
      const iframes = Array.from(document.querySelectorAll("iframe"));
      for (const iframe of iframes) {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!doc) continue;
          const body = doc.querySelector("[contenteditable='true']") as HTMLElement | null;
          if (body && body.innerHTML.replace(/<[^>]+>/g, "").trim().length < 100) {
            body.innerHTML = html;
            body.dispatchEvent(new Event("input", { bubbles: true }));
            return { ok: true, editor: `iframe:${iframe.id || "editor"}` };
          }
        } catch { /* cross-origin iframe, ignorar */ }
      }

      return { ok: false, editor: "no encontrado" };
    }, contentHtml);

    return result.ok;
  } catch {
    return false;
  }
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

  // Diagnóstico agregado el 10/8/2026: reportado por el usuario que el error
  // "es posible que se hayan acabado los tokens..." es solo una SUPOSICIÓN
  // del código (no viene de ningún mensaje real de 10minutesWebsite). Un
  // volcado de pantalla real (cuenta de Mariana Romero) mostró que la vista
  // previa (`img[alt="Preview"]`) se queda en 0px/oculta en los intentos
  // fallidos, sin ningún error visible en el DOM que confirme la causa real.
  // Para dejar de adivinar, capturamos aquí la respuesta HTTP real que el
  // sitio recibe al pedir la generación de imagen (status code y cuerpo si es
  // texto/JSON): así el próximo fallo va a decir la causa real del backend
  // (p. ej. 429 límite de cuota, 402 sin créditos, 500 error interno) en vez
  // de una hipótesis. Se ignora tráfico irrelevante (CSS, fuentes, analytics)
  // para no inflar el log ni intentar leer el cuerpo de respuestas binarias.
  const networkLog: string[] = [];
  let currentImageAttempt = 0;
  const onImageNetworkResponse = (response: PlaywrightResponse) => {
    const url = response.url();
    const status = response.status();
    const looksRelevant = /imag|generat/i.test(url);
    if (!looksRelevant && status < 400) return;
    const contentType = response.headers()["content-type"] ?? "";
    const canReadBody = /json|text/i.test(contentType);
    void (async () => {
      const bodySnippet = canReadBody
        ? await response
            .text()
            .then((t) =>
              t ? ` cuerpo: "${t.slice(0, 200).replace(/\s+/g, " ")}"` : "",
            )
            .catch(() => "")
        : "";
      networkLog.push(
        `[intento ${currentImageAttempt}] ${response
          .request()
          .method()} ${url} → ${status} ${response.statusText()}${bodySnippet}`,
      );
    })();
  };
  page.on("response", onImageNetworkResponse);

  for (let attempt = 1; attempt <= MAX_IMAGE_ATTEMPTS; attempt++) {
    currentImageAttempt = attempt;
    // El textarea del prompt se llamaba `#images` en la cuenta donde se mapeó
    // el flujo (29/7/2026), pero los ids de este formulario NO son iguales en
    // todas las cuentas: en la de Gustavo Torres el campo `#images` sencillamente
    // no existe (confirmado el 7/8/2026 con el volcado de diagnóstico), y el
    // `fill` se pasaba 30s esperándolo, fallaba en silencio y luego se pulsaba
    // "Generar imagen" con el campo vacío — de ahí el "This field is required"
    // del sitio y la vista previa congelada en 0px. La misma diferencia se ve en
    // el resumen: aquí es `#excerpt`, y el código lo busca como `#excerptes`.
    //
    // Por eso ya no se depende de un id fijo: se ubica el campo por lo que es
    // (un textarea/input cuyo id o name habla de imagen) y se marca con un
    // atributo temporal para poder usar el `fill` normal de Playwright. Si el
    // id fijo existe, se sigue prefiriendo — no cambia nada para las cuentas
    // que ya funcionaban.
    const prompt = buildImagePrompt(summary);
    const promptSelector = await page
      .evaluate(() => {
        const byId = document.querySelector("#images");
        if (byId) return "#images";
        const candidate = Array.from(
          document.querySelectorAll("textarea, input[type=text]"),
        ).find((el) => {
          const field = el as HTMLInputElement;
          return /imag/i.test(field.id) || /imag/i.test(field.name ?? "");
        });
        if (!candidate) return null;
        candidate.setAttribute("data-auto-articulos-prompt", "1");
        return '[data-auto-articulos-prompt="1"]';
      })
      .catch(() => null);

    // El error de este fill se descartaba en silencio; ahora se guarda para
    // volcarlo en el diagnóstico de más abajo. Se sigue sin abortar por esto.
    const promptFillError = promptSelector
      ? await page
          .locator(promptSelector)
          .fill(prompt, { force: true, timeout: NAV_TIMEOUT_MS })
          .then(() => null)
          .catch((e: unknown) => (e instanceof Error ? e.message : String(e)))
      : "no se encontró ningún campo de prompt de imagen en la página";

    if (attempt === 1) {
      await onStep(
        promptFillError
          ? `Aviso: no se pudo escribir el prompt de la imagen (${promptFillError.slice(0, 120)}).`
          : `Prompt de imagen escrito en "${promptSelector}".`,
      );
    }

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
      //
      // Volcado de diagnóstico agregado el 7/8/2026, mismo criterio que se usó
      // para desatascar la generación de contenido: en vez de quedarnos con la
      // hipótesis de los tokens, dejamos en el log el estado real de la
      // pantalla. Interesa sobre todo el `alt` de las imágenes presentes: este
      // paso busca `img[alt="Preview"]` con el texto en inglés fijo, y si el
      // sitio lo rotula distinto en esta cuenta, el selector nunca casa y la
      // espera se agota aunque la imagen ya esté generada — que es exactamente
      // el tipo de fallo que tenía colgada la generación de contenido.
      //
      // A propósito SIN captura de pantalla: las capturas en base64 pesan
      // cientos de KB y guardarlas siempre fue lo que agotó la cuota de
      // transferencia de la base (bug del 30/7/2026). Esto es solo texto corto.
      const screenState = await page
        .evaluate(() => {
          const imgs = Array.from(document.querySelectorAll("img"))
            .filter((i) => (i as HTMLImageElement).alt)
            .slice(0, 8)
            .map((i) => {
              const img = i as HTMLImageElement;
              return `alt="${img.alt}" (${img.naturalWidth}px, ${
                img.offsetParent === null ? "oculta" : "visible"
              })`;
            });

          // Inventario de todos los campos del formulario con su id y name.
          // Los ids NO son iguales en todas las cuentas (`#excerptes` vs
          // `#excerpt`, `#images` inexistente), así que esta lista es lo que
          // permite mapear la cuenta real en vez de suponer nombres.
          const promptState = Array.from(
            document.querySelectorAll("textarea, input[type=text]"),
          )
            .slice(0, 20)
            .map((el) => {
              const field = el as HTMLInputElement;
              return `${field.tagName.toLowerCase()}#${
                field.id || "(sin id)"
              }[name=${field.name || "-"}] ${field.value?.length ?? 0} chars${
                (field as HTMLElement).offsetParent === null ? " oculto" : ""
              }`;
            })
            .join(" ; ");

          // Qué campos están marcados como obligatorios/vacíos: para cada
          // mensaje de error visible, buscamos el input o textarea más cercano
          // y reportamos su id/name, que es lo que dice qué hay que llenar.
          const requiredFields = Array.from(
            document.querySelectorAll(
              '[class*="error" i], [class*="invalid" i], [role="alert"]',
            ),
          )
            .filter((el) => (el as HTMLElement).offsetParent !== null)
            .filter((el) => /required|obligatorio/i.test(el.textContent ?? ""))
            .slice(0, 5)
            .map((el) => {
              const scope = el.closest("div, form, section") ?? el.parentElement;
              const field = scope?.querySelector("input, textarea, select") as
                | HTMLInputElement
                | null;
              return field
                ? `${field.tagName.toLowerCase()}#${field.id || "(sin id)"}[name=${
                    field.name || "-"
                  }] con ${field.value?.length ?? 0} chars`
                : "campo no identificado";
            });

          const alerts = Array.from(
            document.querySelectorAll(
              '[class*="alert" i], [class*="error" i], [class*="toast" i], [role="alert"]',
            ),
          )
            .filter((el) => (el as HTMLElement).offsetParent !== null)
            .map((el) => (el.textContent ?? "").trim())
            .filter((t) => t.length > 0)
            .slice(0, 3)
            .join(" | ");

          return {
            imgs: imgs.length ? imgs.join(" ; ") : "ninguna imagen con alt",
            promptState,
            requiredFields: requiredFields.length
              ? requiredFields.join(" ; ")
              : "ningun campo obligatorio identificado",
            alerts: alerts || "sin mensajes visibles",
          };
        })
        .catch(() => null);

      // Pequeña espera para dar tiempo a que terminen de leerse los cuerpos
      // de respuestas de red que ya llegaron pero cuyo `.text()` async
      // todavía no se había resuelto en el instante exacto del timeout.
      await page.waitForTimeout(500).catch(() => {});

      const networkSummary = networkLog.length
        ? networkLog.slice(-6).join(" ; ")
        : "no se observó ninguna petición de red relacionada con la generación de imagen (posible bloqueo del lado del cliente antes de llamar al servidor, o la petición seguía pendiente sin responder).";

      await onStep(
        screenState
          ? `DIAGNÓSTICO [pantalla al agotarse la espera de la imagen] campos del formulario: ${
              screenState.promptState
            }${
              promptFillError
                ? ` || FALLO AL ESCRIBIR EL PROMPT: ${promptFillError.slice(0, 200)}`
                : " || el prompt se escribió sin error"
            } || campos obligatorios vacíos: ${
              screenState.requiredFields
            } || imágenes: ${screenState.imgs} || mensajes: ${screenState.alerts} || red: ${networkSummary}`
          : `DIAGNÓSTICO [pantalla al agotarse la espera de la imagen]: no se pudo leer el estado de la página || red: ${networkSummary}`,
      );

      const message = err instanceof Error ? err.message : String(err);
      const causaReal = networkLog.length
        ? ` Respuesta real del servidor: ${networkLog.slice(-2).join(" ; ")}`
        : " No se detectó ninguna respuesta de red del servidor para la generación de imagen; es posible que se hayan acabado los tokens/créditos de la cuenta en 10minutesWebsite, o que la petición nunca haya llegado a enviarse.";
      page.off("response", onImageNetworkResponse);
      throw new Error(`${message}${causaReal}`);
    }

    const relevant = await checkPreviewRelevant(page, title, summary);
    if (relevant || attempt === MAX_IMAGE_ATTEMPTS) {
      await confirmImageCrop(page);
      await onStep(
        attempt === 1
          ? "Imagen generada."
          : `Imagen generada (intento ${attempt} de ${MAX_IMAGE_ATTEMPTS}).`,
      );
      page.off("response", onImageNetworkResponse);
      return;
    }
    await onStep(
      `La imagen no parece corresponder al tema del artículo, generando una nueva (intento ${attempt + 1} de ${MAX_IMAGE_ATTEMPTS})...`,
    );
  }
  page.off("response", onImageNetworkResponse);
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

  if (stillOnForm && buttonDisabled) {
    await onStep("El botón está deshabilitado; intentando forzar envío del formulario vía JavaScript...");
    const forced = await page.evaluate(() => {
      const form = document.querySelector("form");
      if (!form) return { ok: false, motivo: "no se encontró formulario" };
      // Remover atributo disabled del botón por si acaso
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        /guardar cambios|save changes/i.test(b.textContent || ""),
      ) as HTMLButtonElement | undefined;
      if (btn) {
        btn.disabled = false;
        btn.classList.remove("disabled");
      }
      // Intentar submit directo
      try {
        form.submit();
        return { ok: true, motivo: "form.submit() ejecutado" };
      } catch (e) {
        return { ok: false, motivo: (e as Error).message };
      }
    });
    await onStep(`Resultado del intento forzado: ${JSON.stringify(forced)}`);
    await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT_MS }).catch(() => {});
  }

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

  return null;
}


