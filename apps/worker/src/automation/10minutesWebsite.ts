import {
  chromium,
  type Page,
  type Response as PlaywrightResponse,
} from "playwright";
import { platformBaseUrl } from "@auto-articulos/shared";
import { buildImagePrompt, isImageRelevant } from "../imagePrompt";
import { generateFaqs, type Faq } from "../faqPrompt";
import { translateText } from "../translateText";
import {
  normalizePhonePlaceholders,
  replacePhonePlaceholders,
} from "../phonePlaceholders";
import { generateCustomArticle } from "./generateCustomArticle";

export interface TenMinutesWebsiteCredentials {
  username: string;
  password: string;
  // Servidor donde vive la cuenta — ver User.platformDomain y el registro
  // PLATFORM_SERVERS en @auto-articulos/shared ("net", "site", "tagcrush").
  // Si no se especifica, se usa .net (comportamiento original).
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
  // País ISO de la cuenta para completar teléfonos locales de EE. UU./Canadá.
  userCountry?: string | null;
  // Nombre para resolver {NOMBRE_AUTOR} de un estilo personalizado.
  authorName?: string | null;
  // Prompt de redacción personalizado cargado desde Run.prompt.
  promptText?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildContactButtonsHtml(
  phone: string,
  whatsappLabel: string,
  callLabel: string,
  includeWhatsApp = true,
  includeCall = true,
  country?: string | null,
): string {
  const digits = normalizeContactPhone(phone, country);
  if (!digits) return "";

  const buttons: string[] = [];
  if (includeWhatsApp) {
    buttons.push(
      '<div class="visible-xs visible-sm" style="text-align:center;margin:20px 0;">',
      `<a href="https://wa.me/${digits}" rel="noopener noreferrer" style="display:inline-flex;align-items:center;justify-content:center;gap:10px;background:#25D366;color:#fff;text-align:center;text-decoration:none;padding:10px 20px;border-radius:7px;box-sizing:border-box;" target="_blank">${escapeHtml(whatsappLabel)}</a>`,
      "</div>",
    );
  }
  if (includeCall) {
    buttons.push(
      '<div class="visible-xs visible-sm" style="text-align:center;margin:20px 0;">',
      `<a href="tel:${digits}" style="display:inline-flex;align-items:center;justify-content:center;gap:10px;background:#838b8e;color:#fff;text-align:center;text-decoration:none;padding:10px 20px;border-radius:7px;box-sizing:border-box;">${escapeHtml(callLabel)}</a>`,
      "</div>",
    );
  }
  return buttons.join("");
}

/** Normaliza a formato internacional sin adivinar prefijos fuera de NANP. */
export function normalizeContactPhone(
  phone: string,
  country?: string | null,
): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) return digits;

  const normalizedCountry = country?.trim().toUpperCase();
  const isNanp = /^[2-9]\d{2}[2-9]\d{6}$/.test(digits);
  // Las cuentas antiguas sin país son el caso histórico de Florida; para un
  // número NANP local aplicamos el mismo prefijo 1 que exige wa.me.
  if (isNanp && (!normalizedCountry || normalizedCountry === "US" || normalizedCountry === "CA")) {
    return `1${digits}`;
  }
  return digits;
}

/** QR de contacto con etiqueta legible y el patrón que ya utiliza la plataforma. */
export function buildContactQrHtml(
  phone: string,
  country?: string | null,
): string {
  const digits = normalizeContactPhone(phone, country);
  if (!digits) return "";

  const whatsappUrl = `https://wa.me/${digits}`;
  return `<div class="hidden-xs hidden-sm" style="text-align:left;margin:20px 0;"><a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;flex-direction:column;align-items:center;text-decoration:none;"><img alt="QR Code" src="https://quickchart.io/chart?cht=qr&amp;chl=${whatsappUrl}&amp;chs=140x140&amp;chld=M|0" style="border:0;display:block;" /><span style="margin-top:8px;line-height:1.25;font-size:14px;font-weight:700;letter-spacing:0.04em;color:#1d1d1f;">WHATSAPP</span></a></div>`;
}

/** Los CTAs del modelo no son confiables: sólo conservamos los botones propios. */
export function removeGeneratedContactLinks(html: string): string {
  return html
    .replace(
      /<a\b[^>]*\bhref=["'](?:https?:\/\/(?:api\.)?whatsapp\.com|https?:\/\/wa\.me|tel:)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,
      "",
    )
    // Al retirar un enlace defectuoso, el modelo a veces deja sólo el título
    // del CTA. No es contenido del artículo ni un contacto funcional.
    .replace(/<p\b[^>]*>\s*(?:whats\s*app|c[oó]digo\s*qr|qr\s*code)\s*<\/p>/gi, "")
    // Si el enlace eliminado era el único hijo, tampoco dejamos la caja
    // responsive vacía que el modelo había creado para ese CTA.
    .replace(/<div\b[^>]*\b(?:visible-xs|visible-sm|hidden-xs|hidden-sm)[^>]*>\s*(?:&nbsp;)?\s*<\/div>/gi, "");
}

/** Inserta los CTA en dos pausas naturales del artículo, nunca juntos al final. */
export function distributeContactButtonsHtml(
  html: string,
  whatsappButton: string,
  callButton: string,
): string {
  const endings = [...html.matchAll(/<\/(?:p|ul|ol|blockquote|h2|h3|h4)>/gi)];
  if (endings.length < 2) {
    return `${whatsappButton}\n${html}\n${callButton}`;
  }

  const firstBlock = Math.ceil(endings.length / 3) - 1;
  const secondBlock = Math.max(
    firstBlock + 1,
    Math.ceil((endings.length * 2) / 3) - 1,
  );
  const firstEnd = (endings[firstBlock].index ?? 0) + endings[firstBlock][0].length;
  const secondEnd = (endings[secondBlock].index ?? 0) + endings[secondBlock][0].length;

  return `${html.slice(0, firstEnd)}\n${whatsappButton}\n${html.slice(firstEnd, secondEnd)}\n${callButton}\n${html.slice(secondEnd)}`;
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
  // Nombre visible del panel ("English", "Español") si la cuenta usa el
  // selector de start-main-control-panel.php; "" en cuentas sin esta función
  // (la mayoría) — ver Category.panel en el schema.
  panel: string;
}

/**
 * Si la cuenta tiene la función de "paneles" activada (no todas la tienen,
 * confirmado por Milton el 15/8/2026), después de iniciar sesión el sitio
 * ofrece un selector — dos recuadros grandes con ícono de casa y texto
 * ("English" / "Español") — antes de dejar entrar al panel de artículos. La
 * URL NO cambia al elegir uno: el sitio guarda cuál está activo en la
 * sesión del servidor, así que hay que volver a este selector para cada
 * panel, uno por uno.
 */
const PANEL_CHOOSER_PATH = "/dashboard/start-main-control-panel.php";

/**
 * Detecta si la cuenta tiene la función de paneles NAVEGANDO al selector a
 * propósito, en vez de esperar a toparse con él por casualidad.
 *
 * Bug real encontrado en vivo el 15/8/2026 (cuenta de Estee Soto, 2 de sus
 * categorías vinieron marcadas "sin panel" en vez de separadas por
 * English/Español): la primera versión solo revisaba si YA estábamos en el
 * selector después de navegar a /dashboard/direct-articles — pero el sitio
 * no obliga a pasar por ahí, deja entrar directo a "el panel que haya
 * quedado activo" cuando se navega directo a esa URL. El selector nunca se
 * detectaba, y solo se leían las categorías de un panel (el que fuera).
 */
async function listPanelLabels(page: Page, baseUrl: string): Promise<string[]> {
  await page.goto(`${baseUrl}${PANEL_CHOOSER_PATH}`, {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT_MS,
  });
  // Cuentas sin esta función: el sitio redirige lejos de esta URL (a
  // direct-articles o donde sea su panel único). Nada que enumerar.
  if (!page.url().includes("start-main-control-panel")) return [];
  // Estructura real confirmada el 15/8/2026 con el código fuente exacto de
  // la cuenta de Estee Soto (ver también selectPanel): cada opción de panel
  // es un <a class="redirect-page-lang"> — clase real y específica del
  // sitio, no un heurístico adivinado. Versiones anteriores intentaron
  // "cualquier <a>/<button> corto" y luego "con ícono adentro", y ambas
  // capturaban texto ajeno (el selector de idioma del login, enlaces de
  // navegación) que hacía fallar el clic siguiente.
  return page.$$eval("a.redirect-page-lang", (els) =>
    els
      .map((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim())
      .filter((t) => t.length > 0),
  );
}

async function selectPanel(
  page: Page,
  baseUrl: string,
  label: string,
): Promise<void> {
  await page.goto(`${baseUrl}${PANEL_CHOOSER_PATH}`, {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT_MS,
  });
  // Cada <a class="redirect-page-lang"> envuelve un <form method="post"
  // action=".../start-homemain.php"> con campos ocultos (usuario, el ID de
  // cuenta interna del panel, un token dinámico, idioma) — confirmado en el
  // código fuente real de la cuenta de Estee Soto, 15/8/2026. El sitio
  // depende de un script propio para enviarlo al hacer clic; en vez de
  // confiar en ese manejador (ya falló dos veces distintas: net::ERR_ABORTED
  // por una carrera de navegación, y un timeout de 30s buscando el clic), se
  // envía el formulario real directamente. Es lo mismo que haría el
  // navegador, solo que explícito y sin depender de timing de eventos.
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS }),
    page.evaluate((targetLabel) => {
      const links = Array.from(
        document.querySelectorAll("a.redirect-page-lang"),
      );
      const link = links.find(
        (el) => (el.textContent ?? "").replace(/\s+/g, " ").trim() === targetLabel,
      );
      const form = link?.closest("form");
      if (!form) {
        throw new Error(`No se encontró el formulario del panel "${targetLabel}".`);
      }
      (form as HTMLFormElement).submit();
    }, label),
  ]);
}

/**
 * Navega con un reintento: cubre el mismo net::ERR_ABORTED de arriba en
 * cualquier otro punto donde el sitio dispare una redirección encadenada
 * justo después de seleccionar panel — un solo reintento resuelve la
 * carrera sin ocultar un fallo real (si el segundo intento también falla,
 * el error real sigue subiendo tal cual).
 */
async function gotoWithRetry(
  page: Page,
  url: string,
  onFail?: () => Promise<void>,
): Promise<void> {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
  } catch (err) {
    if (onFail) await onFail();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
  }
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
  return platformBaseUrl(platformDomain);
}

const ARTICLE_TYPE_NOTICIAS = "2";
const NAV_TIMEOUT_MS = 30_000;
// Evita que una sesión externa o una validación bloqueada deje un lane ocupado indefinidamente.
const ARTICLE_HARD_TIMEOUT_MS = 6 * 60 * 1000;
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
  "Gerador de artigos usando Inteligência Artificial",
];
const TEXT_USAR_CHATGPT = bilingual("Usar ChatGPT", "Use ChatGPT");
const TEXT_CHATGPT_MODAL_TITLE = bilingual(...CHATGPT_MODAL_TITLE_TEXTS);
const TEXT_GENERAR = bilingual("Generar", "Generate", "Gerar");
const TEXT_USAR_CONTENIDO = bilingual("Usar contenido", "Use content", "Usar conteúdo");
const TEXT_GUARDAR_CAMBIOS = bilingual(
  "Guardar cambios",
  "Save changes",
  "Guardar alterações",
  "Salvar alterações",
  "Gravar alterações",
);
const TEXT_GENERAR_IMAGEN = bilingual("Generar imagen", "Generate image", "Gerar imagem", "Gerar imagens");
const TEXT_CREACION_IMAGENES = bilingual(
  "Creación de imágenes con inteligencia artificial",
  "Image creation with artificial intelligence",
  "AI image creation",
  "Criação de imagens com inteligência artificial",
  "Criação de imagens por Inteligência Artificial",
  "Criação de imagens por IA",
  "Criação de imagens",
);
const TEXT_AVISO_IMAGENES_IA = bilingual(
  "Generación de imágenes mediante IA",
  "AI image generation",
  "Geração de imagens por IA",
  "Geração de imagens mediante IA",
  "Geração de imagem por inteligência artificial",
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
  // Panel de origen de la categoría (ver Category.panel) en cuentas con esa
  // función. Como el sitio guarda cuál panel está activo en la sesión, no en
  // la URL, hay que volver a elegirlo explícitamente en CADA publicación —
  // nunca se puede asumir que el panel activo es el correcto.
  categoryPanel: string = "",
): Promise<PublishResult> {
  const baseUrl = resolveBaseUrl(credentials.platformDomain);
  const browser = await chromium.launch({ headless: true });
  let watchdog: NodeJS.Timeout | undefined;
  try {
    const flow = async (): Promise<PublishResult> => {
      const page = await browser.newPage();

    await login(page, baseUrl, credentials, onStep);
    if (categoryPanel) {
      await selectPanel(page, baseUrl, categoryPanel);
      await onStep(`Panel "${categoryPanel}" seleccionado.`);
    }

    const { summary, contentHtml, finalTitle } = await createArticleDraft(
      page,
      baseUrl,
      title,
      categoryExternalId,
      disableIndexing,
      credentials.contentLanguage,
      credentials.articleSignature,
      credentials.userPhone,
      credentials.userCountry,
      credentials.authorName,
      onStep,
      credentials.promptText,
    );
    await generateImage(page, finalTitle, summary, onStep);
    await fillFaqWidget(page, finalTitle, summary, contentHtml, onStep);
    const { url: articleUrl, titleUsed } = await saveAndGetUrl(
      page,
      baseUrl,
      finalTitle,
      onStep,
    );

      return { articleUrl, finalTitle: titleUsed, summary };
    };

    const timeout = new Promise<PublishResult>((_, reject) => {
      watchdog = setTimeout(() => {
        void browser.close().catch(() => {});
        reject(new Error("El artículo superó el tiempo máximo de procesamiento y se devuelve a Oportunidades para reintentarlo."));
      }, ARTICLE_HARD_TIMEOUT_MS);
    });

    return await Promise.race([flow(), timeout]);
  } finally {
    if (watchdog) clearTimeout(watchdog);
    await browser.close();
  }
}

/**
 * Lee las categorías/etiquetas reales configuradas en la cuenta del usuario,
 * para que el dashboard de Auto Artículos las ofrezca en un selector antes de
 * pegar títulos. Son específicas de cada cuenta de 10minutesWebsite.
 */
async function readCategoriesFromCurrentPanel(
  page: Page,
): Promise<Omit<RemoteCategory, "panel">[]> {
  // `data-content` trae el HTML que usa el widget visual del sitio para
  // mostrar un ícono junto al nombre (ej. "<i class='fa-solid ...'></i>
  // Finanza"). Se limpia con el propio parser HTML del navegador
  // (más confiable que un regex) para quedarnos solo con el texto real.
  // `data-sequence` ("0"/"1", verificado en vivo el 5/8/2026) distingue
  // categorías regulares de categorías "de secuencia" del sitio.
  return page.$$eval("#user_label_list_article option", (options) =>
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
}

export async function fetchCategories(
  credentials: TenMinutesWebsiteCredentials,
): Promise<RemoteCategory[]> {
  const baseUrl = resolveBaseUrl(credentials.platformDomain);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await login(page, baseUrl, credentials, async () => {});

    // Se revisa el selector de paneles ANTES de ir a ningún otro lado — ver
    // el comentario de listPanelLabels(). Navegar directo a direct-articles
    // primero (como se hacía antes) deja entrar al panel que haya quedado
    // activo sin pasar por el selector, y nunca lo detecta.
    const panels = await listPanelLabels(page, baseUrl);
    if (panels.length === 0) {
      await page.goto(`${baseUrl}/dashboard/direct-articles`, {
        waitUntil: "domcontentloaded",
        timeout: NAV_TIMEOUT_MS,
      });
      const cats = await readCategoriesFromCurrentPanel(page);
      return cats.map((c) => ({ ...c, panel: "" }));
    }

    const result: RemoteCategory[] = [];
    for (const label of panels) {
      await selectPanel(page, baseUrl, label);
      await gotoWithRetry(page, `${baseUrl}/dashboard/direct-articles`);
      const cats = await readCategoriesFromCurrentPanel(page);
      result.push(...cats.map((c) => ({ ...c, panel: label })));
    }
    return result;
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
    // Se nombra el servidor concreto: desde que hay varios (ver
    // PLATFORM_SERVERS), un login que falla puede deberse a que la cuenta
    // vive en otro dominio y no a credenciales mal escritas, y sin este dato
    // los dos casos se veían idénticos en el mensaje.
    throw new Error(
      `No se pudo iniciar sesión en ${baseUrl}. Verifica que el usuario y la contraseña guardados en Configuración sean correctos, y que esa cuenta realmente exista en ${baseUrl} (si vive en otro servidor, un administrador debe corregirlo en Administración → Usuarios)${alertText ? `. Mensaje visible en el sitio: "${alertText}"` : "."}`,
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
  userCountry: string | null | undefined,
  authorName: string | null | undefined,
  onStep: OnStep,
  promptText?: string | null,
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

  if (promptText) {
    await onStep("Usando estilo de redacción personalizado con prompt propio.");
    await onStep("Generando contenido del artículo con OpenAI...");
    const lang = contentLanguage || "es";
    const customArticle = await generateCustomArticle(
      title,
      promptText,
      lang,
      authorName,
    );
    await onStep(`✓ Artículo generado con éxito por OpenAI. Título: "${customArticle.title}"`);

    let contentHtml = customArticle.contentHtml;

    // El modelo puede devolver los marcadores del sistema en inglés o español.
    // Se normalizan antes de reutilizar el reparador contextual ya probado.
    contentHtml = normalizePhonePlaceholders(contentHtml);

    if (/(?:PHONE_NUMBER|NUMERO-WHATSAPP)/.test(contentHtml)) {
      if (userPhone) {
        const repaired = replacePhonePlaceholders(contentHtml, userPhone);
        contentHtml = repaired.html;
        await onStep(
          `✓ Marcador 'PHONE_NUMBER' reemplazado: ${repaired.replacements.whatsapp} enlace(s) de WhatsApp/QR, ${repaired.replacements.call} de llamada y ${repaired.replacements.other} uso(s) adicional(es).`,
        );
      } else {
        await onStep("⚠️ ADVERTENCIA CRÍTICA: Se detectó el marcador de posición 'PHONE_NUMBER' (botones de WhatsApp o llamada) en el artículo generado, pero NO tienes un número de teléfono configurado en tu perfil. El artículo se publicará con 'PHONE_NUMBER'.");
      }
    }

    // Inyección de firma
    const trimmedSignature = articleSignature?.trim();
    if (trimmedSignature) {
      const signatureText = await translateText(trimmedSignature, lang);
      if (signatureText !== trimmedSignature) {
        await onStep("Tu texto propio fue traducido al idioma del artículo.");
      }
      contentHtml = `${contentHtml}\n<p>${escapeHtml(signatureText)}</p>`;
      await onStep("Texto propio agregado al final del artículo.");
    }

    // Los artículos con prompt propio no reciben la plantilla de CTA de la
    // plataforma. Se descartan CTAs creados por el modelo para no conservar
    // URLs incompletas y se añaden siempre los dos botones oficiales.
    if (userPhone?.replace(/\D/g, "")) {
      contentHtml = removeGeneratedContactLinks(contentHtml);
      const [whatsappLabel, callLabel] = await Promise.all([
        translateText("CONTACTA AHORA", lang),
        translateText("LLAMA AHORA", lang),
      ]);
      const whatsappButton = buildContactButtonsHtml(
        userPhone,
        whatsappLabel,
        callLabel,
        true,
        false,
        userCountry,
      );
      const callButton = buildContactButtonsHtml(
        userPhone,
        whatsappLabel,
        callLabel,
        false,
        true,
        userCountry,
      );
      // QR + WhatsApp en el primer tercio; llamada en el segundo, nunca juntos.
      const whatsappContact = `${buildContactQrHtml(userPhone, userCountry)}${whatsappButton}`;
      contentHtml = distributeContactButtonsHtml(
        contentHtml,
        whatsappContact,
        callButton,
      );
      await onStep("QR de contacto y botones oficiales de WhatsApp/llamada distribuidos dentro del artículo.");
    } else {
      await onStep("⚠️ No se agregaron botones de contacto porque no tienes un teléfono configurado en tu perfil.");
    }

    // El panel español usa #titlees y el panel inglés usa #title. Validamos
    // que el título realmente quedó escrito antes de gastar créditos de imagen.
    const titleSelector = await page
      .evaluate(() => {
        for (const id of ["#titlees", "#title"]) {
          if (document.querySelector(id)) return id;
        }
        return null;
      })
      .catch(() => null);
    if (!titleSelector) {
      throw new Error("No se encontró el campo obligatorio de título (#titlees o #title) en el formulario.");
    }
    const titleField = page.locator(titleSelector);
    await titleField.fill(customArticle.title.slice(0, 200));
    const savedTitle = await titleField.inputValue().catch(() => "");
    if (!savedTitle.trim()) {
      throw new Error("El título generado no quedó escrito en el formulario; se detiene antes de generar imagen o guardar.");
    }
    await onStep("Título completado y verificado en el formulario.");

    // Rellenar resumen
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

    let summary = customArticle.summary || "";
    if (excerptSelector) {
      const excerptField = page.locator(excerptSelector);
      if (summary.length >= 300) {
        summary = summary.slice(0, 280);
        await onStep("Resumen recortado para respetar el límite de 300 caracteres de la plataforma.");
      }
      await excerptField.fill(summary);
      await onStep("Resumen completado en el formulario.");
    }

    // Inyectar HTML en el editor
    await onStep("Inyectando el HTML del artículo en el editor...");
    let injected = await fillCKEditorSource(page, contentHtml, onStep);
    if (!injected) {
      await onStep("No se pudo usar el modo Fuente HTML. Usando inyección programática...");
      await injectContentIntoEditor(page, contentHtml, onStep);
    }

    return { summary, contentHtml, finalTitle: customArticle.title };
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
    const languageOptions = await languageSelect
      .locator("option")
      .evaluateAll((options) =>
        options.map((option) => ({
          value: (option as HTMLOptionElement).value,
          text: (option.textContent ?? "").trim(),
        })),
      )
      .catch(() => [] as { value: string; text: string }[]);
    const normalizedRequestedLanguage = contentLanguage.toLowerCase().split("_")[0];
    const matchingLanguage = languageOptions.find(
      (option) =>
        option.value === contentLanguage ||
        option.value.toLowerCase().split("_")[0] === normalizedRequestedLanguage ||
        option.text.toLowerCase().split(" ")[0] === normalizedRequestedLanguage,
    );
    if (matchingLanguage?.value) {
      // Evita esperar el timeout completo cuando la cuenta usa valores como
      // "es_ES" y Auto Artículos guarda el código corto "es".
      await languageSelect.selectOption(matchingLanguage.value, { timeout: 5000 }).catch(() => {});
    }
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

  // DIAGNÓSTICO: inspeccionar el botón "Usar contenido" (#btncopy) para saber qué función llama
  const usearContenidoInfo = await dialog.evaluate(() => {
    const usarBtn = document.getElementById("btncopy") || Array.from(document.querySelectorAll("button")).find((b) => /usar contenido|use content/i.test(b.textContent || ""));
    if (!usarBtn) return { found: false };
    const attrs: Record<string, string> = {};
    for (const attr of Array.from(usarBtn.attributes)) {
      attrs[attr.name] = attr.value;
    }
    // Buscar en TODOS los scripts del documento funciones que manejen #btncopy o "Usar contenido"
    const allScriptText = Array.from(document.querySelectorAll("script"))
      .map((s) => s.textContent || "")
      .join("\n");
    // Buscar referencias a btncopy
    const btncopyRefs = allScriptText.match(/btncopy|#btncopy/gi) || [];
    // Buscar la función que se asigna al click
    const clickHandlerMatch = allScriptText.match(/(\$|jQuery)?\s*\(?["']?#btncopy["']?\)?\s*.\s*click\s*\(?\s*function\s*\([^)]*\)\s*\{[^}]*response_content[^}]*\}/i);
    // Buscar cualquier función que use response_content
    const responseContentRefs = allScriptText.match(/[^{]{0,100}response_content[^}]{0,200}/gi) || [];
    // Buscar la función que llena el campo de contenido
    const contentFillMatch = allScriptText.match(/contentes|response_content|copy_content|paste_content/gi) || [];
    return {
      found: true,
      buttonText: usarBtn.textContent?.trim(),
      attributes: attrs,
      btncopyRefs: btncopyRefs.slice(0, 10),
      clickHandlerFound: !!clickHandlerMatch,
      clickHandlerSnippet: clickHandlerMatch ? clickHandlerMatch[0].slice(0, 300) : null,
      responseContentRefs: responseContentRefs.slice(0, 5),
      contentFillRefs: contentFillMatch.slice(0, 10),
    };
  });
  await onStep(`DIAGNÓSTICO [Usar contenido]: ${JSON.stringify(usearContenidoInfo).slice(0, 2000)}`);

  // Guardar contenido y resumen del modal ANTES de hacer clic, para
  // reinyectar después si "Usar contenido" no logra transferirlos (ver bug
  // del 11/8/2026 más abajo, que hasta ahora solo cubría el contenido).
  const modalContentBefore = await dialog.locator("textarea").nth(1).inputValue().catch(() => "");
  const modalSummaryBefore = await dialog.locator("textarea").nth(2).inputValue().catch(() => "");

  await dialog.getByRole("button", { name: TEXT_USAR_CONTENIDO }).click();
  await dialog.waitFor({ state: "hidden", timeout: NAV_TIMEOUT_MS });
  await page.waitForTimeout(2000);

  const editorInfo = await diagnoseEditorState(page);
  await onStep(
    `Editor post-Usar contenido: textarea#contentes=${editorInfo.contentesLen}chars, saveBtn=${editorInfo.saveBtnEnabled ? "habilitado" : "DESHABILITADO"}`,
  );

  // Bug real encontrado el 11/8/2026 (cuenta de Lorena Álvarez): esta
  // verificación disparaba la reparación solo si el botón "Guardar cambios"
  // ya estaba deshabilitado — pero el sitio tarda en correr su propia
  // validación (deshabilita el botón recién cerca del guardado real, no
  // apenas termina "Usar contenido"). En el log real, a los 2s el botón
  // seguía "habilitado" con el editor en 0 chars; como la condición miraba el
  // botón, nunca se disparó la inyección, y minutos después, al guardar de
  // verdad, el campo seguía vacío. El dato confiable es el LARGO real del
  // contenido, no el estado (todavía no actualizado) del botón.
  if (editorInfo.contentesLen === 0 && modalContentBefore.length > 100) {
    await onStep("El contenido no llegó al editor. Intentando inyección con contenido del modal...");
    await injectContentIntoEditor(page, modalContentBefore, onStep);
  }

  // Bug real encontrado el 15/8/2026 (cuenta de Lorena Álvarez, confirmado
  // con volcado directo del HTML/JS real del sitio, no adivinado): el
  // formulario real tiene un campo de título propio, `#titlees`
  // (`<input required maxlength="200">`, con `aria-describedby="titlees-error"`
  // igual que `#excerptes`), que es DISTINTO del título que la IA escribe
  // dentro del modal. "Usar contenido" debería transferirlo también, pero
  // nunca se verificaba — a diferencia del contenido y (más abajo) el
  // resumen, este campo no tenía ningún repaso. Si falla en transferirse
  // (mismo tipo de falla intermitente que ya afecta a los otros dos campos),
  // el sitio bloquea "Guardar cambios" con "Este campo es obligatorio" sin
  // que el contenido ni el resumen tengan ningún problema — que es
  // exactamente el patrón visto en producción (ambos con texto real, el
  // guardado igual bloqueado, y nadie identificaba cuál era el campo real).
  const titleSelector = await page
    .evaluate(() => (document.querySelector("#titlees") ? "#titlees" : null))
    .catch(() => null);
  if (titleSelector) {
    const titleField = page.locator(titleSelector);
    const currentTitle = await titleField.inputValue().catch(() => "");
    if (currentTitle.length === 0 && finalTitle.length > 0) {
      await titleField.fill(finalTitle.slice(0, 200)).catch(() => {});
      await onStep(
        "El título no llegó al campo del formulario tras 'Usar contenido'. Se completó con el título generado por la IA.",
      );
    }
  }

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

    // Mismo fallo que el del contenido documentado arriba (11/8/2026): "Usar
    // contenido" a veces no transfiere el resumen al campo real tampoco, y a
    // diferencia del contenido esto no tenía ningún repaso. El campo queda
    // vacío, es obligatorio, y el sitio bloquea "Guardar cambios" en
    // silencio (mensaje "Este campo es obligatorio" sin abortar el intento
    // ni decir qué campo es) — visto en producción el 14/8/2026, cuenta de
    // Lorena Álvarez, 4 intentos seguidos con el contenido y la imagen bien
    // pero el guardado fallando siempre.
    if (summary.length === 0 && modalSummaryBefore.length > 0) {
      summary = modalSummaryBefore.slice(0, 280);
      await excerptField.fill(summary).catch(() => {});
      await onStep(
        "El resumen no llegó al campo del formulario tras 'Usar contenido'. Se completó con el resumen generado por la IA.",
      );
    }

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

async function diagnoseEditorState(page: Page): Promise<{
  contentesLen: number;
  editableLen: number;
  saveBtnEnabled: boolean;
}> {
  return page.evaluate(() => {
    const contentesEl = document.querySelector("#contentes") as HTMLTextAreaElement | null;
    const editableEl = document.querySelector("[contenteditable='true']") as HTMLElement | null;
    const saveBtn = Array.from(document.querySelectorAll("button")).find((b) =>
      /guardar cambios|save changes/i.test(b.textContent || ""),
    ) as HTMLButtonElement | undefined;

    return {
      contentesLen: (contentesEl?.value || "").replace(/<[^>]+>/g, "").trim().length,
      editableLen: (editableEl?.innerHTML || "").replace(/<[^>]+>/g, "").trim().length,
      saveBtnEnabled: saveBtn ? !saveBtn.disabled && !saveBtn.classList.contains("disabled") : false,
    };
  });
}

async function injectContentIntoEditor(
  page: Page,
  contentHtml: string,
  onStep: OnStep,
): Promise<void> {
  const plainText = contentHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Bug real encontrado el 11/8/2026 (cuenta de Lorena Álvarez): tanto
  // TinyMCE.setContent() como CKEditor.setData() solo actualizan el
  // contenido INTERNO del editor — ninguno de los dos sincroniza por sí solo
  // el <textarea id="contentes"> real que el sitio valida antes de guardar.
  // El sitio habilita "Guardar cambios" de forma OPTIMISTA en cuanto detecta
  // el evento de cambio del editor visual, aunque el textarea real siga
  // vacío — por eso el log decía "✓ HABILITADO" segundos después de inyectar,
  // pero minutos más tarde, al guardar de verdad, seguía en 0 chars. Mismo
  // patrón que el bug ya arreglado en el chequeo inicial (ver más arriba):
  // el estado del botón es un dato que llega tarde/optimista, no confiable.
  // Fix: forzar la sincronización real (TinyMCE.save(), CKEditor
  // updateElement()) y verificar contra el LARGO REAL del textarea, no
  // contra el estado del botón.

  // Estrategia 1: TinyMCE setContent + save() (sincroniza al textarea real)
  const tinymceResult = await page.evaluate((html) => {
    const tinymce = (window as unknown as { tinymce?: { editors?: Array<{ setContent: (h: string) => void; save?: () => void; id: string }> } }).tinymce;
    if (tinymce?.editors?.length) {
      for (const ed of tinymce.editors) {
        if (ed.setContent) {
          ed.setContent(html);
          ed.save?.();
          return true;
        }
      }
    }
    return false;
  }, contentHtml).catch(() => false);

  if (tinymceResult) {
    await onStep("Inyección vía TinyMCE setContent ejecutada.");
    await page.waitForTimeout(1000);
    const state = await diagnoseEditorState(page);
    if (state.contentesLen > 0) {
      await onStep(
        `✓ Contenido confirmado en el textarea real después de TinyMCE (${state.contentesLen} chars).`,
      );
      return;
    }
  }

  // Estrategia 2: CKEditor setData + updateElement() (sincroniza al textarea real)
  const ckResult = await page.evaluate((html) => {
    const ck = (window as unknown as { CKEDITOR?: { instances?: Record<string, { setData: (h: string) => void; updateElement: () => void }> } }).CKEDITOR;
    if (ck?.instances) {
      for (const key of Object.keys(ck.instances)) {
        try {
          ck.instances[key].setData(html);
          ck.instances[key].updateElement();
          return true;
        } catch { /* intentar siguiente */ }
      }
    }
    return false;
  }, contentHtml).catch(() => false);

  if (ckResult) {
    await onStep("Inyección vía CKEditor setData ejecutada.");
    await page.waitForTimeout(1000);
    const state = await diagnoseEditorState(page);
    if (state.contentesLen > 0) {
      await onStep(
        `✓ Contenido confirmado en el textarea real después de CKEditor (${state.contentesLen} chars).`,
      );
      return;
    }
  }

  if (await fillCKEditorSource(page, contentHtml, onStep)) {
      const state = await diagnoseEditorState(page);
      if (state.contentesLen > 0) {
          await onStep(`✓ Contenido confirmado en el textarea real después de Fuente HTML (${state.contentesLen} chars).`);
          return;
      }
  }

  // Estrategia 3: Encontrar contenteditable visible y usar execCommand('insertHTML')
  const editableResult = await page.evaluate((html) => {
    const editables = Array.from(document.querySelectorAll("[contenteditable='true']")) as HTMLElement[];
    for (const el of editables) {
      if ((el as HTMLElement).offsetParent !== null) {
        el.focus();
        document.execCommand("selectAll", false, undefined);
        document.execCommand("insertHTML", false, html);
        return true;
      }
    }
    return false;
  }, contentHtml).catch(() => false);

  if (editableResult) {
    await onStep("Inyección vía execCommand insertHTML en contenteditable.");
    await page.waitForTimeout(1000);
    const state = await diagnoseEditorState(page);
    if (state.contentesLen > 0 || state.editableLen > 100) {
      await onStep(
        `✓ Contenido confirmado después de insertHTML (textarea=${state.contentesLen} chars, editable=${state.editableLen} chars).`,
      );
      return;
    }
  }

  // Estrategia 4: Click en el editor visual + keyboard.insertText (simula tecleo real)
  const visualEditor = page.locator("[contenteditable='true']").first();
  const isVisible = await visualEditor.isVisible().catch(() => false);
  if (isVisible) {
    await visualEditor.click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);
    await page.keyboard.insertText(plainText.slice(0, 500));
    await page.waitForTimeout(1000);
    const state = await diagnoseEditorState(page);
    if (state.contentesLen > 0 || state.editableLen > 100) {
      await onStep(
        `✓ Contenido confirmado después de keyboard.insertText (textarea=${state.contentesLen} chars, editable=${state.editableLen} chars).`,
      );
      return;
    }
  }

  // Estrategia 5: Materialize - el textarea #contentes puede necesitar un trigger especial
  // Materialize hace sync desde el textarea al visual con ciertos eventos
  const materializeResult = await page.evaluate((html) => {
    const ta = document.querySelector("#contentes") as HTMLTextAreaElement | null;
    if (!ta) return false;

    // Materialize: destruir y recrear el editor
    ta.value = html;
    ta.style.display = "block";
    ta.style.visibility = "visible";
    ta.style.height = "auto";
    ta.style.position = "relative";
    ta.classList.remove("initialized");

    // Disparar eventos en orden específico para Materialize
    ta.dispatchEvent(new Event("focus", { bubbles: true }));
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    ta.dispatchEvent(new Event("keyup", { bubbles: true }));
    ta.dispatchEvent(new Event("change", { bubbles: true }));
    ta.dispatchEvent(new Event("blur", { bubbles: true }));

    // Si hay una instancia Materialize de TextareaResize, triggers
    const instance = (ta as unknown as { M_TextareaResize?: { handleResize?: () => void } }).M_TextareaResize;
    if (instance?.handleResize) instance.handleResize();

    return true;
  }, contentHtml).catch(() => false);

  if (materializeResult) {
    await onStep("Inyección vía Materialize textarea trigger.");
    await page.waitForTimeout(1500);
    const state = await diagnoseEditorState(page);
    if (state.contentesLen > 0) {
      await onStep(
        `✓ Contenido confirmado en el textarea real después de Materialize (${state.contentesLen} chars).`,
      );
      return;
    }
  }

  await onStep("⚠️ Ninguna estrategia logró poner el contenido real en el textarea. Se continúa de todas formas.");
}

async function fillCKEditorSource(
  page: Page,
  contentHtml: string,
  onStep: OnStep,
): Promise<boolean> {
  try {
    const sourceButton = page.locator(".cke_button__source, a[class*='cke_button__source']").first();
    if (await sourceButton.isVisible()) {
      await onStep("Haciendo clic en el botón 'Fuente HTML' de CKEditor...");
      await sourceButton.click();
      await page.waitForTimeout(1000);

      const sourceTextarea = page.locator("textarea.cke_source, .cke_source textarea").first();
      if (await sourceTextarea.isVisible()) {
        await onStep("Pegando el HTML en el textarea de Fuente HTML...");
        await sourceTextarea.fill(contentHtml);
        await page.waitForTimeout(500);

        await onStep("Haciendo clic nuevamente en 'Fuente HTML' para volver al modo visual...");
        await sourceButton.click();
        await page.waitForTimeout(1000);
        return true;
      }
    }
  } catch (e) {
    await onStep(`Aviso: fallo al usar Fuente HTML de CKEditor (${e}). Se continuará con inyección directa.`);
  }
  return false;
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
  // Bug real de producción (15/8/2026, cuenta de Lorena Álvarez): esta
  // tabla se carga por AJAX del lado del servidor (DataTables server-side
  // processing), así que justo después de `page.goto()` suele seguir
  // mostrando "Loading..." en vez de filas reales. Llamar a `.search().draw()`
  // en ese momento corre la búsqueda contra una tabla que todavía no
  // terminó de cargar la primera vez — confirmado en vivo: 3 segundos
  // después de entrar a la página, la primera fila seguía en "Loading..."
  // y una búsqueda en ese estado devolvía "No se encontraron resultados"
  // aunque el artículo sí existiera. Como cada vuelta del bucle de arriba
  // hace un `page.goto()` nuevo, esta carrera se repetía en cada intento
  // durante los 90s completos. Se espera a que la tabla termine de cargar
  // de verdad antes de buscar.
  await page
    .waitForFunction(
      () => {
        const firstCell = document.querySelector("table tbody tr td");
        const text = (firstCell?.textContent ?? "").trim();
        return text.length > 0 && !/loading/i.test(text);
      },
      undefined,
      { timeout: 15_000 },
    )
    .catch(() => {});

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

  // Confirmado en vivo (15/8/2026, cuenta de Lorena Álvarez): el guardado
  // funciona y el artículo SÍ existe en la tabla (con el link real de
  // `a.consultar` correcto) mientras nuestra propia búsqueda seguía
  // reportando "no aparece". Esta tabla hace búsqueda por servidor
  // (DataTables server-side processing, no filtrado en el navegador), así
  // que `.search().draw()` dispara una llamada AJAX real; 800ms no siempre
  // alcanza para que vuelva antes de leer las filas. Se sube a 2000ms.
  await page.waitForTimeout(2000);

  const row = await getNewestRow(page);
  return row?.href ?? null;
}

async function saveAndGetUrl(
  page: Page,
  baseUrl: string,
  expectedTitle: string,
  onStep: OnStep,
): Promise<{ url: string | null; titleUsed: string }> {
  // Causa raíz encontrada leyendo el JS del sitio (15/8/2026, cuenta de
  // Lorena Álvarez): el botón real de guardar, #save_art, arranca
  // deshabilitado y SOLO se re-habilita dentro del handler de
  // `$('#type').on('change', ...)`, y únicamente si el formulario ya pasa
  // `$('#form_buyer_seller_articles').valid()` EN ESE INSTANTE. Nuestro
  // automatismo dispara ese `change` de #type una sola vez, al principio del
  // flujo, cuando el formulario todavía no tiene contenido/resumen/título —
  // así que #save_art queda deshabilitado para siempre sin importar que
  // después sí se llenen todos los campos. Se dispara `change` de nuevo,
  // ahora con el formulario completo, para que el sitio re-evalúe y
  // habilite el botón real.
  //
  // Segunda causa, encontrada DESPUÉS de arreglar la anterior (15/8/2026,
  // mismo caso): con el botón ya re-habilitado, el validador SÍ corre, y
  // reveló el bloqueo real en varios intentos: `#titlees` tiene una regla
  // `remote` contra el sitio que chequea título duplicado
  // (`check_duplicate_title_article`) — Lorena venía reintentando la misma
  // categoría con títulos casi idénticos generados por la IA, y alguno
  // coincidía exacto con un artículo ya guardado. El mensaje real es "Ya
  // existe un artículo con este título", NO "Este campo es obligatorio"
  // (ese texto solo aparecía mezclado en el ruido de accesibilidad del
  // editor). Si el validador señala justo esto, se le agrega una variación
  // al título y se reintenta el guardado (sin regenerar contenido de nuevo)
  // antes de darse por vencido.
  let titleInUse = expectedTitle;
  const MAX_SAVE_ATTEMPTS = 3;

  const makeUniqueTitle = (baseTitle: string, attempt: number) => {
    // Un número incremental no basta: puede existir ya porque otro intento
    // anterior o una publicación manual usó exactamente el mismo sufijo.
    // La marca corta de tiempo evita que el validador remoto vuelva a
    // rechazar la segunda oportunidad del mismo artículo.
    const uniqueness = ` — versión ${Date.now().toString().slice(-7)}-${attempt}`;
    return `${baseTitle.slice(0, 200 - uniqueness.length)}${uniqueness}`;
  };

  const revalidateTitleAndForm = async () => {
    // El sitio usa jQuery Validate con una regla remota en #titlees.
    // Cambiar el valor no siempre limpia el error anterior ni vuelve a
    // habilitar #save_art, por lo que se fuerzan los eventos del formulario
    // y una validación explícita antes de consultar el botón.
    await page.evaluate(() => {
      const title = document.querySelector("#titlees") as HTMLInputElement | null;
      const jq = (window as unknown as { jQuery?: (selector: string) => { valid?: () => boolean } }).jQuery;
      if (!title) return;
      for (const eventName of ["input", "keyup", "change", "blur", "focusout"]) {
        title.dispatchEvent(new Event(eventName, { bubbles: true }));
      }
      jq?.("#titlees").valid?.();
    }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.dispatchEvent("#type", "change").catch(() => {});
  };

  for (let saveAttempt = 1; saveAttempt <= MAX_SAVE_ATTEMPTS; saveAttempt++) {
    await onStep("Guardando y publicando el artículo...");
    await revalidateTitleAndForm();

    // Bug real encontrado en producción (15/8/2026, cuenta de Lorena
    // Álvarez, en el reintento por título duplicado): 300ms alcanza cuando
    // `validator.valid()` ya tiene cacheado el resultado del chequeo
    // `remote` de título duplicado para el valor actual, pero para un
    // título RECIÉN mutado (nunca antes chequeado) ese chequeo es una
    // llamada AJAX nueva — `.valid()` la dispara y devuelve `false` de
    // forma optimista/pesimista mientras está en vuelo, así que a los
    // 300ms el botón seguía deshabilitado y el `.click()` de Playwright se
    // quedaba 30s esperando un elemento que nunca se habilitaba. Se
    // sondea el estado real del botón hasta 8s en vez de una espera fija.
    const saveBtn = page.getByRole("button", { name: TEXT_GUARDAR_CAMBIOS }).first();
    const enableDeadline = Date.now() + 10000;
    let saveBtnEnabled = false;
    while (Date.now() < enableDeadline) {
      saveBtnEnabled = !(await saveBtn.isDisabled().catch(() => true));
      if (saveBtnEnabled) break;
      await page.dispatchEvent("#type", "change").catch(() => {});
      await page.waitForTimeout(250);
    }
    if (!saveBtnEnabled) {
      await onStep(
        "El botón de guardar no se habilitó a tiempo (probable chequeo de título duplicado todavía en curso).",
      );
    }

    await saveBtn.click({ timeout: 5000 }).catch(() => {});
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

    const requiredFieldsState = stillOnForm
      ? await page
          .evaluate(() => {
            const els = Array.from(
              document.querySelectorAll<
                HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
              >("input[required], textarea[required], select[required], [aria-required='true']"),
            );
            return els
              .filter((el) => (el as HTMLElement).offsetParent !== null)
              .filter((el) => !el.value || el.value.trim().length === 0)
              .map((el) => {
                const label = el.id
                  ? `#${el.id}`
                  : el.getAttribute("name")
                    ? `[name="${el.getAttribute("name")}"]`
                    : el.tagName.toLowerCase();
                return `${label} (vacío)`;
              })
              .join(", ");
          })
          .catch(() => "")
      : "";

    // Fuente de verdad real, en vez de heurísticas adivinadas: el sitio usa
    // jQuery Validate sobre #form_buyer_seller_articles. Su `errorList`
    // trae el campo y mensaje EXACTOS que están fallando ahora mismo —
    // cubre también reglas sin atributo `required` en el HTML, como la
    // `remote` de título duplicado.
    const validatorErrors = stillOnForm
      ? await page
          .evaluate(() => {
            const jq = (
              window as unknown as {
                jQuery?: (s: string) => {
                  data: (k: string) => {
                    errorList?: { element: HTMLElement; message: string }[];
                  } | undefined;
                };
              }
            ).jQuery;
            const validator = jq?.("#form_buyer_seller_articles").data("validator");
            if (!validator?.errorList) return "";
            return validator.errorList
              .map((e) => {
                const el = e.element;
                const label = el.id
                  ? `#${el.id}`
                  : el.getAttribute("name")
                    ? `[name="${el.getAttribute("name")}"]`
                    : el.tagName.toLowerCase();
                return `${label}: ${e.message}`;
              })
              .join(" | ");
          })
          .catch(() => "")
      : "";

    await onStep(
      `Diagnóstico de guardado: sigue en el formulario=${stillOnForm}, botón deshabilitado=${buttonDisabled}, mensajes visibles="${alertText}"${
        requiredFieldsState ? `, campos obligatorios: ${requiredFieldsState}` : ""
      }${validatorErrors ? `, errores reales del validador: ${validatorErrors}` : ""}`,
    );

    if (!stillOnForm) break;

    const isDuplicateTitle =
      /titlees/i.test(validatorErrors) && /existe/i.test(validatorErrors);

    if (isDuplicateTitle && saveAttempt < MAX_SAVE_ATTEMPTS) {
      const mutatedTitle = makeUniqueTitle(expectedTitle, saveAttempt + 1);
      const titleField = page.locator("#titlees");
      await titleField.fill(mutatedTitle).catch(() => {});
      // La regla `remote` de jQuery Validate se dispara al perder el foco.
      // Forzar también el cambio evita que el botón conserve el error remoto
      // del título anterior y permanezca deshabilitado indefinidamente.
      await titleField.press("Tab").catch(() => {});
      await revalidateTitleAndForm();
      titleInUse = mutatedTitle;
      await onStep(
        `El título "${expectedTitle}" ya existe en la cuenta. Reintentando guardar con "${mutatedTitle}".`,
      );
      continue;
    }

    if (stillOnForm) {
      // Si el sitio no habilitó el guardado, no tiene sentido navegar y
      // esperar 90 segundos buscando una publicación que nunca se envió.
      // Devuelve inmediatamente para que queue.ts registre el intento y,
      // si corresponde, avance al siguiente título del lote.
      await onStep(
        "El sitio no permitió guardar este artículo después de agotar la validación. Se continúa con el siguiente título del lote.",
      );
      return { url: null, titleUsed: titleInUse };
    }

    break;
  }

  await onStep(
    `Buscando el artículo publicado por su título: "${titleInUse}"...`,
  );
  const deadline = Date.now() + SAVE_VERIFICATION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      await page.goto(`${baseUrl}/dashboard/user_buyer_seller_articles.php`, {
        waitUntil: "domcontentloaded",
        timeout: NAV_TIMEOUT_MS,
      });
      const href = await findArticleByTitle(page, titleInUse);
      if (href) return { url: href, titleUsed: titleInUse };
    } catch (err) {
      // Bug real de producción (15/8/2026, cuenta de Lorena Álvarez):
      // net::ERR_ABORTED en este goto no se atrapaba, así que un solo fallo
      // transitorio de navegación tumbaba TODA la verificación de una vez,
      // antes de agotar los 90s que el bucle está diseñado para reintentar.
      // El resultado visible era justo lo que este bucle existe para evitar:
      // "El artículo no aparece en el listado tras guardar" incluso cuando
      // el artículo sí se había guardado, solo que la próxima vuelta nunca
      // llegó a intentarse.
      await onStep(
        `Fallo de navegación al revisar el listado (se reintenta): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    await page.waitForTimeout(1500);
  }

  return { url: null, titleUsed: titleInUse };
}
