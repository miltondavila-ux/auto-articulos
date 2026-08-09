import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";
import { chromium } from "playwright";
import dotenv from "dotenv";
import { replacePhonePlaceholders } from "./phonePlaceholders";

dotenv.config();

export async function runPatriciaFix(
  username: string,
  password: string,
  domain: string,
  onStep: (msg: string) => Promise<void> | void
): Promise<{ repaired: number; alreadyCorrect: number; failed: number }> {
  const baseUrl = `https://www.10minuteswebsite.${domain}`;
  await onStep(`Conectando a 10minutesWebsite (${baseUrl}) como ${username}...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const MAX_REPAIRS_PER_RUN = 2;
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let processedCount = 0;


  try {
    // 1. Iniciar sesión
    await page.goto(`${baseUrl}/dashboard/start.php`, { waitUntil: "domcontentloaded" });
    const englishLink = page.getByText("en", { exact: true });
    if (await englishLink.isVisible().catch(() => false)) {
      await englishLink.click();
      await page.waitForLoadState("domcontentloaded");
    }

    await page.getByText("Using your Email + Password", { exact: true }).click();
    await page.fill('input[name="email"]', username);
    await page.fill('input[name="password"]', password);
    await page.getByRole("button", { name: "Login", exact: true }).click();

    await page.waitForSelector('a[href="user_buyer_seller_articles.php"]', { timeout: 30000 });
    await onStep("Sesión iniciada correctamente.");

    let hasNextPage = true;
    let pageNum = 1;

    while (hasNextPage && processedCount < MAX_REPAIRS_PER_RUN) {
      await page.goto(`${baseUrl}/dashboard/user_buyer_seller_articles.php`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForSelector("table tbody tr td", { timeout: 25000 });
      await page.waitForFunction(() => {
        const cell = document.querySelector("table tbody tr td");
        if (!cell) return false;
        const text = cell.textContent || "";
        return !text.toLowerCase().includes("loading") && !text.toLowerCase().includes("cargando");
      }, { timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(1000);

      const firstCellText = await page.locator("table tbody tr td").first().innerText().catch(() => "");
      if (
        firstCellText.includes("No data") ||
        firstCellText.includes("No se encontraron") ||
        firstCellText.includes("Ningún dato")
      ) {
        break;
      }

      if (pageNum > 1) {
        for (let p = 1; p < pageNum; p++) {
          const nextBtn = page.locator("a.next, li.next a, button.next").first();
          if (await nextBtn.isVisible().catch(() => false)) {
            await nextBtn.click();
            await page.waitForTimeout(2000);
          }
        }
      }

      const rowLocators = page.locator("table tbody tr");
      const count = await rowLocators.count();
      const batchLimit = Math.min(count, MAX_REPAIRS_PER_RUN - processedCount);
      
      const idsToProcess: { id: string, title: string, publicUrl: string, editUrl: string }[] = [];
      for (let i = 0; i < batchLimit; i++) {
        const id = ((await rowLocators.nth(i).locator("input[name='checkbox[]']").getAttribute("value").catch(() => "")) || "").trim();
        const title = (await rowLocators.nth(i).locator("td").nth(3).innerText().catch(() => "")).trim();
        const publicUrl = (await rowLocators.nth(i).locator("a.consultar").first().getAttribute("href").catch(() => "")) || "";
        if (id && id !== "Loading...") {
          idsToProcess.push({ id, title, publicUrl, editUrl: `${baseUrl}/dashboard/direct-edit-articles?articles_id_=${id}` });
        }
      }

      if (idsToProcess.length > 0) {
        const startId = idsToProcess[0].id;
        const endId = idsToProcess[idsToProcess.length - 1].id;
        await onStep(`Iniciando lote: Se revisarán los artículos desde el ID_INICIO [${startId}] hasta el ID_FIN [${endId}]`);

        for (const article of idsToProcess) {
          if (processedCount >= MAX_REPAIRS_PER_RUN) break;
          const progressPrefix = `[Art. ${article.id}]`;
          
          let attempt = 1;
          const MAX_ATTEMPTS = 3;
          let success = false;
          
          while (attempt <= MAX_ATTEMPTS && !success) {
            try {
              await onStep(`${progressPrefix} (Intento ${attempt}/${MAX_ATTEMPTS}) Procesando: "${article.title}"...`);
              await page.goto(article.editUrl, { waitUntil: "domcontentloaded" });

              const editorTextarea = page.locator('textarea[name="contentes"], textarea[name="content"]').first();
              await editorTextarea.waitFor({ state: "attached", timeout: 15000 }).catch(() => {});

              if (await editorTextarea.count() === 0) {
                throw new Error("No se localizó el editor de contenido.");
              }

              let contentHtml = await editorTextarea.inputValue();

              if (
                contentHtml.includes("PHONE_NUMBER") ||
                contentHtml.includes("NUMERO-WHATSAPP") ||
                contentHtml.includes("19546529929")
              ) {
                const repaired = replacePhonePlaceholders(contentHtml, "+19546529929");
                if (
                  repaired.html === contentHtml &&
                  !contentHtml.includes("PHONE_NUMBER") &&
                  !contentHtml.includes("NUMERO-WHATSAPP")
                ) {
                  skippedCount++;
                  await onStep(`[Art. ${article.id}] Ya corregido: ${article.title} — Enlace: ${article.publicUrl || article.editUrl}`);
                  success = true;
                  break;
                }
                
                contentHtml = repaired.html;

                await editorTextarea.evaluate((el) => {
                  el.removeAttribute("disabled");
                  el.removeAttribute("readonly");
                });
                await editorTextarea.fill(repaired.html).catch(() => {});

                await page.evaluate(({ val }) => {
                  const textareas = document.querySelectorAll('textarea');
                  textareas.forEach((ta) => {
                    const name = ta.getAttribute('name') || '';
                    const id = ta.getAttribute('id') || '';
                    if (name === 'contentes' || name === 'content' || id === 'contentes' || id === 'content') {
                      (ta as HTMLTextAreaElement).value = val;
                      ta.dispatchEvent(new Event('input', { bubbles: true }));
                      ta.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                  });

                  const tiny = (window as any).tinyMCE || (window as any).tinymce;
                  if (tiny) {
                    const editors = Array.isArray(tiny.editors) ? tiny.editors : (tiny.editors ? Object.values(tiny.editors) : []);
                    editors.forEach((editor: any) => {
                      if (editor && typeof editor.setContent === 'function') {
                        editor.setContent(val);
                        if (typeof editor.save === 'function') editor.save();
                      }
                    });
                    if (tiny.activeEditor && typeof tiny.activeEditor.setContent === 'function') {
                      tiny.activeEditor.setContent(val);
                      if (typeof tiny.activeEditor.save === 'function') tiny.activeEditor.save();
                    }
                    if (typeof tiny.triggerSave === 'function') {
                      tiny.triggerSave();
                    }
                  }
                  
                  const ck = (window as any).CKEDITOR;
                  if (ck && ck.instances) {
                    Object.values(ck.instances).forEach((editor: any) => {
                      if (editor && typeof editor.setData === 'function') {
                        editor.setData(val);
                        if (typeof editor.updateElement === 'function') editor.updateElement();
                      }
                    });
                  }
                }, { val: contentHtml });

                const saveBtn = page.getByRole("button", { name: /Guardar cambios|Save changes|Guardar/i }).first();
                if (await saveBtn.isVisible()) {
                  await Promise.all([
                    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {}),
                    saveBtn.click(),
                  ]);

                  await page.waitForTimeout(3000);

                  await page.goto(article.editUrl, { waitUntil: "domcontentloaded" });
                  const savedTextarea = page
                    .locator('textarea[name="contentes"], textarea[name="content"]')
                    .first();
                  await savedTextarea.waitFor({ state: "attached", timeout: 15000 });
                  const savedHtml = await savedTextarea.inputValue();
                  const verified = replacePhonePlaceholders(savedHtml, "+19546529929");
                  if (
                    savedHtml.includes("PHONE_NUMBER") ||
                    savedHtml.includes("NUMERO-WHATSAPP") ||
                    verified.html !== savedHtml
                  ) {
                    throw new Error("Verificación fallida. HTML incorrecto persistido.");
                  }
                  successCount++;
                  await onStep(`✓ ¡Reparado con éxito! (${successCount} de ${MAX_REPAIRS_PER_RUN}): ${article.title} — Enlace: ${article.publicUrl || article.editUrl}`);
                  success = true;
                } else {
                  throw new Error("No se encontró el botón Guardar.");
                }
              } else {
                skippedCount++;
                await onStep(`[Art. ${article.id}] Ya corregido: ${article.title} — Enlace: ${article.publicUrl || article.editUrl}`);
                success = true;
              }
            } catch (articleErr) {
              const errorMessage = articleErr instanceof Error ? articleErr.stack || articleErr.message : String(articleErr);
              await onStep(`${progressPrefix} ERROR DETALLADO en intento ${attempt}: ${errorMessage}`);
              
              attempt++;
              if (attempt > MAX_ATTEMPTS) {
                await onStep(`${progressPrefix} FATAL: Se superó el límite de ${MAX_ATTEMPTS} intentos fallidos. Deteniendo el worker.`);
                throw new Error(`Kill Switch: Fallo estructural en el artículo ${article.id} tras 3 intentos. Causa original: ${errorMessage}`);
              }
            }
          }
          processedCount++;
        }
      }

      if (processedCount >= MAX_REPAIRS_PER_RUN) {
        break;
      }

      await page.goto(`${baseUrl}/dashboard/user_buyer_seller_articles.php`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("table tbody tr td", { timeout: 15000 });
      for (let p = 1; p < pageNum; p++) {
        const nextBtn = page.locator("a.next, li.next a, button.next").first();
        if (await nextBtn.isVisible().catch(() => false)) {
          await nextBtn.click();
          await page.waitForTimeout(2000);
        }
      }

      const nextBtn = page.locator("a.next, li.next a, button.next").first();
      const isNextVisible = await nextBtn.isVisible().catch(() => false);
      const isNextDisabled = await nextBtn.evaluate((el) =>
        el.classList.contains("disabled") ||
        el.getAttribute("aria-disabled") === "true" ||
        (el as HTMLButtonElement).disabled
      ).catch(() => true);

      if (isNextVisible && !isNextDisabled) {
        pageNum++;
      } else {
        hasNextPage = false;
      }
    }

    return { repaired: successCount, alreadyCorrect: skippedCount, failed: errorCount };

  } catch (err) {
    await onStep(`Error fatal del worker: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log("Iniciando corrección de artículos de Patricia Coy...");

  const user = await prisma.user.findFirst({
    where: {
      email: {
        contains: "patricia",
        mode: "insensitive",
      },
    },
  });

  if (!user) {
    console.error("Error: No se encontró el usuario de Patricia Coy.");
    return;
  }

  const credentials = await prisma.credential.findFirst({
    where: { userId: user.id, platform: "10minutesWebsite" },
  });

  if (!credentials) {
    console.error("Error: No se encontraron credenciales.");
    return;
  }

  const username = decryptSecret(credentials.encryptedUsername);
  const password = decryptSecret(credentials.encryptedPassword);
  const domain = user.platformDomain || "net";

  await runPatriciaFix(username, password, domain, async (msg) => {
    console.log(msg);
  });
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error("Error fatal:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
