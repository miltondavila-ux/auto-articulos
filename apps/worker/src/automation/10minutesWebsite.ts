import { chromium, type Page } from "playwright";
import { buildImagePrompt, isImageRelevant } from "../imagePrompt";

export interface TenMinutesWebsiteCredentials {
  username: string;
  password: string;
}

export interface PublishResult {
  articleUrl: string | null;
  finalTitle: string;
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
const SAVE_VERIFICATION_TIMEOUT_MS = 90_000;

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
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();

    await login(page, credentials, onStep);

    const { summary, contentHtml, finalTitle } = await createArticleDraft(
      page,
      title,
      categoryExternalId,
      disableIndexing,
      onStep,
    );
    await generateImage(page, finalTitle, summary, onStep);
    await fillFaqWidget(page, title, summary, contentHtml, onStep);
    const articleUrl = await saveAndGetUrl(page, finalTitle, onStep);

    return { articleUrl, finalTitle };
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
        .filter((c) => c.externalId && c.name),
    );
  } finally {
    await browser.close();
  }
}

async function login(
  page: Page,
  credentials: TenMinutesWebsiteCredentials,
  onStep: OnStep,
): Promise<void> {
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
  disableIndexing: boolean,
  onStep: OnStep,
): Promise<{ summary: string; contentHtml: string; finalTitle: string }> {
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
  await onStep(
    "Generando contenido con inteligencia artificial (puede tardar un minuto)...",
  );

  // El generador escribe Contenido, Resumen y Título en ese orden (streaming).
  // Esperamos a que el campo Título dentro del modal tenga texto real
  // (no el placeholder "Please wait we are getting the data...").
  await page.waitForFunction(
    () => {
      const chatGptDialog = Array.from(
        document.querySelectorAll(".modal"),
      ).find((el) =>
        (el.textContent ?? "").includes(
          "Generador de artículos usando Inteligencia Artificial",
        ),
      );
      if (!chatGptDialog) return false;
      const fields = Array.from(chatGptDialog.querySelectorAll("textarea"));
      const last = fields[fields.length - 1] as HTMLTextAreaElement | undefined;
      return Boolean(last && last.value && !last.value.includes("Please wait"));
    },
    undefined,
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

  await dialog.getByRole("button", { name: "Usar contenido" }).click();
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

async function generateImage(
  page: Page,
  title: string,
  summary: string,
  onStep: OnStep,
): Promise<void> {
  await onStep(
    "Generando imagen con inteligencia artificial (puede tardar un minuto)...",
  );
  await page
    .getByText("Creación de imágenes con inteligencia artificial", {
      exact: false,
    })
    .first()
    .click();

  const generarImagenBtn = page.locator("button.aigenerationbutton", {
    hasText: "Generar imagen",
  });
  await generarImagenBtn.waitFor({ state: "visible", timeout: NAV_TIMEOUT_MS });

  for (let attempt = 1; attempt <= MAX_IMAGE_ATTEMPTS; attempt++) {
    // #images es el textarea real que lee "Generar imagen" (verificado en
    // vivo el 29/7/2026): escribimos ahí nuestro propio prompt, basado en el
    // título y resumen reales, justo antes de generar.
    const prompt = await buildImagePrompt(title, summary);
    await page.fill("#images", prompt).catch(() => {});
    await generarImagenBtn.click();

    // La generación de imagen es asíncrona: hay que esperar a que aparezca la
    // vista previa dentro del recorte de foto antes de continuar.
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

    const relevant = await checkPreviewRelevant(page, title, summary);
    if (relevant || attempt === MAX_IMAGE_ATTEMPTS) {
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
 * Arma un bloque de Preguntas Frecuentes (visible + schema.org FAQPage en
 * JSON-LD) a partir del título y el contenido real generado para el
 * artículo, y lo coloca en el campo "Widget (opcional)" (#widgetcode) al pie
 * del formulario. Es un textarea de texto libre sin validaciones (verificado
 * en vivo el 29/7/2026: escribir aquí no afecta el guardado del artículo,
 * a diferencia del campo de imagen).
 */
async function fillFaqWidget(
  page: Page,
  title: string,
  summary: string,
  contentHtml: string,
  onStep: OnStep,
): Promise<void> {
  const widgetHtml = buildFaqWidgetHtml(title, summary, contentHtml);
  await page.fill("#widgetcode", widgetHtml);
  await onStep("Preguntas frecuentes (FAQ) agregadas al artículo.");
}

function buildFaqWidgetHtml(
  title: string,
  summary: string,
  contentHtml: string,
): string {
  const plainContent = stripHtml(contentHtml);
  const sentences = [
    ...splitIntoSentences(summary),
    ...splitIntoSentences(plainContent),
  ];

  const faqs = [
    {
      q: `¿Qué debo saber sobre "${title}"?`,
      a: sentences[0] ?? summary.trim() ?? title,
    },
    {
      q: "¿Qué opciones tengo disponibles?",
      a:
        sentences[1] ??
        "Existen varias opciones disponibles según tu situación particular.",
    },
    {
      q: "¿Cómo puedo tomar la mejor decisión en mi caso?",
      a:
        sentences[2] ??
        "Es recomendable comparar los detalles de cada opción antes de decidir.",
    },
    {
      q: "¿A quién puedo contactar para recibir asesoría personalizada?",
      a: "Puedes contactar a un agente certificado de seguros de salud para recibir orientación personalizada según tu situación.",
    },
  ];

  const visibleHtml = [
    '<div class="auto-articulos-faq">',
    "<h3>Preguntas frecuentes</h3>",
    ...faqs.map(
      (f) => `<p><strong>${escapeHtml(f.q)}</strong><br>${escapeHtml(f.a)}</p>`,
    ),
    "</div>",
  ].join("\n");

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return `${visibleHtml}\n<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
  expectedTitle: string,
  onStep: OnStep,
): Promise<string | null> {
  await onStep("Guardando y publicando el artículo...");
  const saveBtn = page.getByRole("button", { name: "Guardar cambios" }).first();
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
    .getByRole("button", { name: "Guardar cambios" })
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
  await emitScreenshot(
    page,
    "Estado justo después de hacer clic en Guardar cambios",
    onStep,
  );

  // Localizamos el artículo por el título real que la IA le asignó (guardado
  // en createArticleDraft), no por posición de fila ni por comparar N° antes
  // vs. después: se pidió explícitamente localizarlo así.
  await onStep(
    `Buscando el artículo publicado por su título: "${expectedTitle}"...`,
  );
  const deadline = Date.now() + SAVE_VERIFICATION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await page.goto(`${BASE_URL}/dashboard/user_buyer_seller_articles.php`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    });
    const href = await findArticleByTitle(page, expectedTitle);
    if (href) return href;
    await page.waitForTimeout(1500);
  }

  // No se encontró dentro del plazo: guardamos una última captura del
  // listado tal como quedó, para diagnosticar sin adivinar.
  await emitScreenshot(
    page,
    "Listado de artículos al agotarse el plazo de búsqueda",
    onStep,
  );
  return null;
}

async function emitScreenshot(
  page: Page,
  label: string,
  onStep: OnStep,
): Promise<void> {
  const buffer = await page
    .screenshot({ type: "jpeg", quality: 40, fullPage: true })
    .catch(() => null);
  if (!buffer) return;
  await onStep(
    `DIAGNÓSTICO [${label}]: data:image/jpeg;base64,${buffer.toString("base64")}`,
  );
}
