import { chromium, type Page } from "playwright";
import sharp from "sharp";

export interface TenMinutesWebsiteCredentials {
  username: string;
  password: string;
}

export interface PublishOptions {
  disableIndexing: boolean;
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
const SAVE_VERIFICATION_TIMEOUT_MS = 90_000;
const MAX_IMAGE_ATTEMPTS = 3;

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
 * Si el artículo no aparece en el listado tras guardar, se lanza un error en
 * vez de devolver éxito con enlace vacío (dos incidentes reales el 29/7/2026
 * mostraron "Publicado" con enlace vacío sin que el artículo existiera de
 * verdad en el sitio) — así el llamador reintenta o detiene el lote en vez de
 * reportar un falso éxito.
 */
export async function publishArticle(
  credentials: TenMinutesWebsiteCredentials,
  title: string,
  categoryExternalId: string,
  options: PublishOptions,
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

    const { summary, contentHtml } = await createArticleDraft(
      page,
      title,
      categoryExternalId,
      options.disableIndexing,
      onStep
    );
    await generateImage(page, onStep);
    await fillFaqWidget(page, title, summary, contentHtml, onStep);
    const articleUrl = await saveAndGetUrl(page, beforeId, onStep);

    if (!articleUrl) {
      throw new Error(
        "El artículo no aparece en el listado tras guardar: es probable que no se haya publicado."
      );
    }

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
  disableIndexing: boolean,
  onStep: OnStep
): Promise<{ summary: string; contentHtml: string }> {
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

  // #activate_indexing viene activado por defecto en la plataforma. Solo lo
  // tocamos cuando el usuario pide explícitamente desactivar la indexación
  // para este lote; si no, lo dejamos tal cual (activado).
  if (disableIndexing) {
    await page.locator("#activate_indexing").setChecked(false, { force: true });
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

  // El modal escribe los campos en orden: idea, Contenido, Resumen, Título,
  // prompt de imagen. Leemos el Contenido (HTML) aquí, mientras el modal
  // sigue abierto, para usarlo como base del FAQ que se agrega más adelante.
  const contentHtml = await dialog.locator("textarea").nth(1).inputValue().catch(() => "");

  await dialog.getByRole("button", { name: "Usar contenido" }).click();
  await dialog.waitFor({ state: "hidden", timeout: NAV_TIMEOUT_MS });

  // #excerptes es el campo "Resumen" del formulario principal, ya poblado
  // por el botón anterior. Es texto plano y corto: la mejor materia prima
  // para armar el FAQ de forma legible.
  const summary = await page.locator("#excerptes").inputValue().catch(() => "");

  return { summary, contentHtml };
}

async function generateImage(page: Page, onStep: OnStep): Promise<void> {
  await onStep("Generando imagen con inteligencia artificial (puede tardar un minuto)...");
  await page.getByText("Creación de imágenes con inteligencia artificial", { exact: false }).first().click();

  const generarImagenBtn = page.locator("button.aigenerationbutton", {
    hasText: "Generar imagen",
  });

  // Hasta 3 intentos, sin ser exigentes: solo rechazamos resultados obviamente
  // rotos (una imagen de un solo color, o un paisaje vacío sin nada relevante),
  // no imágenes simplemente mejorables. Si los 3 intentos salen "planos",
  // seguimos con el último de todos modos para no bloquear el lote.
  for (let attempt = 1; attempt <= MAX_IMAGE_ATTEMPTS; attempt++) {
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

    const previewSrc = await page.getAttribute('img[alt="Preview"]', "src").catch(() => null);
    const flat = previewSrc ? await isFlatOrEmptyImage(page, previewSrc) : false;

    if (!flat || attempt === MAX_IMAGE_ATTEMPTS) {
      break;
    }
    await onStep(
      `La imagen salió casi de un solo color o vacía; generando de nuevo (intento ${attempt + 1} de ${MAX_IMAGE_ATTEMPTS})...`
    );
  }

  await onStep("Imagen generada.");
}

/**
 * Detecta imágenes claramente rotas: de un solo color o paisajes vacíos sin
 * ningún sujeto ni detalle. Reducimos la imagen a una cuadrícula pequeña y
 * medimos cuánto varía el color entre celdas — una imagen real y con
 * contenido variará mucho; una rota o vacía casi no varía. El umbral es
 * deliberadamente permisivo (no exigente): solo atrapa casos evidentes.
 */
async function isFlatOrEmptyImage(page: Page, previewSrc: string): Promise<boolean> {
  try {
    const response = await page.request.get(previewSrc);
    const buffer = await response.body();

    const { data } = await sharp(buffer)
      .resize(16, 16, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    const mean = sum / data.length;

    let variance = 0;
    for (let i = 0; i < data.length; i++) {
      const diff = data[i] - mean;
      variance += diff * diff;
    }
    const stddev = Math.sqrt(variance / data.length);

    return stddev < 12;
  } catch {
    // Si no se puede descargar/analizar, no bloqueamos el flujo por esto.
    return false;
  }
}

/**
 * Arma un bloque de Preguntas Frecuentes (visible + schema.org FAQPage en
 * JSON-LD) a partir del título y el contenido real generado para el
 * artículo, y lo coloca en el campo "Widget (opcional)" (#widgetcode) al pie
 * del formulario. Es un textarea de texto libre sin validaciones, pensado
 * justamente para pegar código HTML — a diferencia del campo de imagen, no
 * hay riesgo conocido de que esto rompa el guardado del artículo.
 */
async function fillFaqWidget(
  page: Page,
  title: string,
  summary: string,
  contentHtml: string,
  onStep: OnStep
): Promise<void> {
  const widgetHtml = buildFaqWidgetHtml(title, summary, contentHtml);
  await page.fill("#widgetcode", widgetHtml);
  await onStep("Preguntas frecuentes (FAQ) agregadas al artículo.");
}

function buildFaqWidgetHtml(title: string, summary: string, contentHtml: string): string {
  const plainContent = stripHtml(contentHtml);
  const sentences = [...splitIntoSentences(summary), ...splitIntoSentences(plainContent)];

  const faqs = [
    {
      q: `¿Qué debo saber sobre "${title}"?`,
      a: sentences[0] ?? summary.trim() ?? title,
    },
    {
      q: "¿Qué opciones tengo disponibles?",
      a: sentences[1] ?? "Existen varias opciones disponibles según tu situación particular.",
    },
    {
      q: "¿Cómo puedo tomar la mejor decisión en mi caso?",
      a: sentences[2] ?? "Es recomendable comparar los detalles de cada opción antes de decidir.",
    },
    {
      q: "¿A quién puedo contactar para recibir asesoría personalizada?",
      a: "Puedes contactar a un agente certificado de seguros de salud para recibir orientación personalizada según tu situación.",
    },
  ];

  const visibleHtml = [
    '<div class="auto-articulos-faq">',
    "<h3>Preguntas frecuentes</h3>",
    ...faqs.map((f) => `<p><strong>${escapeHtml(f.q)}</strong><br>${escapeHtml(f.a)}</p>`),
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
  //
  // Usamos una ventana más amplia que NAV_TIMEOUT_MS aquí: con el reintento
  // de imagen y el widget FAQ, el guardado real puede tardar más en
  // reflejarse en el listado que los 30s que bastaban antes.
  await onStep("Buscando el enlace del artículo publicado...");
  const deadline = Date.now() + SAVE_VERIFICATION_TIMEOUT_MS;
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
