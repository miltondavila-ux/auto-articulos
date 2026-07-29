import { chromium, type Page } from "playwright";

export interface TenMinutesWebsiteCredentials {
  username: string;
  password: string;
}

export interface PublishResult {
  articleUrl: string | null;
}

export interface RemoteCategory {
  externalId: string;
  name: string;
}

export type OnStep = (message: string) => Promise<void>;

const BASE_URL = "https://10minuteswebsite.net";
const ARTICLE_TYPE_NOTICIAS = "2";
const NAV_TIMEOUT_MS = 30_000;
const CONTENT_GENERATION_TIMEOUT_MS = 90_000;
const IMAGE_GENERATION_TIMEOUT_MS = 90_000;

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
 *
 * Prompt de imagen: verificado en vivo el 29/7/2026 que el campo real que lee
 * el botón "Generar imagen" es el textarea #images del formulario principal
 * (no un campo dentro del modal de ChatGPT). Sobreescribirlo con nuestro
 * propio prompt ANTES de hacer clic en "Generar imagen" cambia efectivamente
 * la imagen resultante (confirmado con una prueba real: prompt de "playa
 * tropical al atardecer" produjo esa imagen exacta).
 */
export async function publishArticle(
  credentials: TenMinutesWebsiteCredentials,
  title: string,
  categoryExternalId: string,
  onStep: OnStep
): Promise<PublishResult> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();

    await login(page, credentials, onStep);

    // Anotamos el N° de artículo más reciente ANTES de crear el nuevo, para
    // luego poder confirmar cuál es el artículo recién publicado (el título
    // final puede diferir del que enviamos, porque la IA lo reescribe).
    await page.goto(`${BASE_URL}/dashboard/user_buyer_seller_articles.php`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    });
    const beforeId = await getTopArticleId(page);

    const summary = await createArticleDraft(page, title, categoryExternalId, onStep);
    await generateImage(page, title, summary, onStep);
    const articleUrl = await saveAndGetUrl(page, beforeId, onStep);

    return { articleUrl };
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
  credentials: TenMinutesWebsiteCredentials
): Promise<RemoteCategory[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await login(page, credentials, async () => {});

    await page.goto(`${BASE_URL}/dashboard/direct-articles`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    });

    return await page.$$eval("#user_label_list_article option", (options) =>
      options
        .map((o) => ({
          externalId: (o as HTMLOptionElement).value,
          name: (o as HTMLOptionElement).dataset.content ?? "",
        }))
        .filter((c) => c.externalId && c.name)
    );
  } finally {
    await browser.close();
  }
}

async function login(page: Page, credentials: TenMinutesWebsiteCredentials, onStep: OnStep): Promise<void> {
  await onStep("Iniciando sesión en 10minutesWebsite...");
  await page.goto(`${BASE_URL}/dashboard/start.php`, {
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

  await page.waitForSelector('a[href="user_buyer_seller_articles.php"]', {
    timeout: NAV_TIMEOUT_MS,
  });
  await onStep("Sesión iniciada correctamente.");
}

async function createArticleDraft(
  page: Page,
  title: string,
  categoryExternalId: string,
  onStep: OnStep
): Promise<string> {
  await onStep("Abriendo formulario de creación de artículo...");
  await page.goto(`${BASE_URL}/dashboard/direct-articles`, {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT_MS,
  });

  await page.selectOption("#type", ARTICLE_TYPE_NOTICIAS);

  // #user_label_list_article es un <select multiple> reforzado visualmente
  // por un widget (se ve como combobox), pero fijar el value real y disparar
  // "change" es suficiente para que el widget se sincronice.
  await page.selectOption("#user_label_list_article", categoryExternalId);
  await page.dispatchEvent("#user_label_list_article", "change");
  await onStep("Categoría seleccionada.");

  await page.getByRole("button", { name: "Usar ChatGPT" }).click();

  // Selector específico: la página también tiene un widget de chat en vivo
  // ("Lucy") con role="dialog" oculto, así que no basta con ".modal, [role='dialog']".
  const dialog = page.locator(".modal", {
    hasText: "Generador de artículos usando Inteligencia Artificial",
  });
  await dialog.waitFor({ state: "visible", timeout: NAV_TIMEOUT_MS });

  const ideaTextarea = dialog.locator("textarea").first();
  await ideaTextarea.fill(title);

  await dialog.getByRole("button", { name: "Generar" }).click();
  await onStep("Generando contenido con inteligencia artificial (puede tardar un minuto)...");

  // El generador escribe Contenido, Resumen y Título en ese orden (streaming).
  // Esperamos a que el campo Título dentro del modal tenga texto real
  // (no el placeholder "Please wait we are getting the data...").
  await page.waitForFunction(
    () => {
      const chatGptDialog = Array.from(document.querySelectorAll(".modal")).find((el) =>
        (el.textContent ?? "").includes("Generador de artículos usando Inteligencia Artificial")
      );
      if (!chatGptDialog) return false;
      const fields = Array.from(chatGptDialog.querySelectorAll("textarea"));
      const last = fields[fields.length - 1] as HTMLTextAreaElement | undefined;
      return Boolean(last && last.value && !last.value.includes("Please wait"));
    },
    undefined,
    { timeout: CONTENT_GENERATION_TIMEOUT_MS }
  );
  await onStep("Contenido generado. Aplicándolo al artículo...");

  await dialog.getByRole("button", { name: "Usar contenido" }).click();
  await dialog.waitFor({ state: "hidden", timeout: NAV_TIMEOUT_MS });

  // #excerptes es el campo "Resumen" del formulario principal, ya poblado
  // por el botón anterior. Es texto plano y corto: la mejor materia prima
  // para armar un prompt de imagen fiel al contenido real del artículo.
  return page.locator("#excerptes").inputValue().catch(() => "");
}

async function generateImage(page: Page, title: string, summary: string, onStep: OnStep): Promise<void> {
  await onStep("Generando imagen con inteligencia artificial (puede tardar un minuto)...");
  await page.getByText("Creación de imágenes con inteligencia artificial", { exact: false }).first().click();

  // La plataforma auto-genera su propio prompt en #images de forma
  // asíncrona apenas se cierra el modal de ChatGPT. Esperamos a que esa
  // llamada se asiente antes de sobreescribirlo con el nuestro, para que no
  // nos pise el valor justo antes de generar la imagen.
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});

  const prompt = buildImagePrompt(title, summary);
  await page.fill("#images", prompt);

  const generarImagenBtn = page.locator("button.aigenerationbutton", {
    hasText: "Generar imagen",
  });
  await generarImagenBtn.waitFor({ state: "visible", timeout: NAV_TIMEOUT_MS });
  await generarImagenBtn.click();

  // La generación de imagen es asíncrona: hay que esperar a que aparezca la
  // vista previa dentro del recorte de foto antes de continuar.
  await page.waitForSelector('img[alt="Preview"]', {
    state: "attached",
    timeout: IMAGE_GENERATION_TIMEOUT_MS,
  });
  await page.waitForFunction(
    () => {
      const preview = document.querySelector('img[alt="Preview"]') as HTMLImageElement | null;
      return Boolean(preview && preview.naturalWidth > 0);
    },
    undefined,
    { timeout: IMAGE_GENERATION_TIMEOUT_MS }
  );
  await onStep("Imagen generada.");
}

// #images tiene maxlength=600 en la plataforma. El bloque "IMPORTANTE" (sin
// texto) va primero para garantizar que sobreviva un eventual recorte; el
// contexto del resumen del artículo se trunca al final si hace falta.
const IMAGE_PROMPT_MAX_LEN = 600;

function buildImagePrompt(title: string, summary: string): string {
  const header =
    `Fotografía profesional, hiperrealista y visualmente espectacular sobre: "${title}". ` +
    `IMPORTANTE: la imagen no debe contener absolutamente ningún texto, letra, número, símbolo, logotipo, cartel ni marca de agua. ` +
    `Debe verse como una foto real tomada con cámara profesional (no una ilustración, dibujo, render 3D ni caricatura), ` +
    `con iluminación natural dramática, colores vívidos y composición centrada para permitir recortes seguros.`;

  const cleanSummary = summary.replace(/\s+/g, " ").trim();
  if (!cleanSummary) return header.slice(0, IMAGE_PROMPT_MAX_LEN);

  const prefix = " Contexto del artículo: ";
  const remaining = IMAGE_PROMPT_MAX_LEN - header.length - prefix.length - 1;
  if (remaining < 20) return header.slice(0, IMAGE_PROMPT_MAX_LEN);

  return (header + prefix + cleanSummary.slice(0, remaining) + ".").slice(0, IMAGE_PROMPT_MAX_LEN);
}

async function getTopArticleId(listPage: Page): Promise<string | null> {
  return listPage
    .locator("table tbody tr")
    .first()
    .locator("td")
    .first()
    .innerText()
    .catch(() => null);
}

async function saveAndGetUrl(
  page: Page,
  beforeId: string | null,
  onStep: OnStep
): Promise<string | null> {
  await onStep("Guardando y publicando el artículo...");
  await page.getByRole("button", { name: "Guardar cambios" }).first().click();
  await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT_MS }).catch(() => {});

  // El listado ordena por más reciente primero, y el título publicado puede
  // diferir del que enviamos (la IA lo reescribe), así que no buscamos por
  // texto: esperamos a que cambie el N° de artículo en la primera fila
  // respecto al que anotamos antes de crear el borrador, y tomamos su enlace
  // "Ver" (clase "consultar"), el permalink público real.
  await onStep("Buscando el enlace del artículo publicado...");
  const deadline = Date.now() + NAV_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await page.goto(`${BASE_URL}/dashboard/user_buyer_seller_articles.php`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    });
    const currentId = await getTopArticleId(page);
    if (currentId && currentId !== beforeId) {
      return await page
        .locator("table tbody tr")
        .first()
        .locator("a.consultar")
        .first()
        .getAttribute("href")
        .catch(() => null);
    }
    await page.waitForTimeout(1500);
  }
  return null;
}
