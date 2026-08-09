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
): Promise<void> {
  const baseUrl = `https://www.10minuteswebsite.${domain}`;
  await onStep(`Conectando a 10minutesWebsite (${baseUrl}) como ${username}...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Límite de prueba inicial: exactamente 1 artículo
  const MAX_REPAIRS_PER_RUN = 1;
  const TARGET_ARTICLE_ID = "89325";
  let successCount = 0;
  let skippedCount = 0;

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

    // Recorreremos las páginas de una en una y repararemos al vuelo los artículos
    while (hasNextPage && successCount < MAX_REPAIRS_PER_RUN) {
      await onStep(`Abriendo página ${pageNum} de la lista de artículos...`);
      await page.goto(`${baseUrl}/dashboard/user_buyer_seller_articles.php?page=${pageNum}`, { waitUntil: "domcontentloaded" }).catch(async () => {
        await page.goto(`${baseUrl}/dashboard/user_buyer_seller_articles.php`, { waitUntil: "domcontentloaded" });
      });

      // Esperar a que la tabla cargue y el indicador "Loading" desaparezca
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
        await onStep("La lista de artículos está vacía.");
        break;
      }

      // Si no es la primera página y no usamos query param, navegamos haciendo clics
      if (pageNum > 1) {
        for (let p = 1; p < pageNum; p++) {
          const nextBtn = page.locator("a.next, li.next a, button.next").first();
          if (await nextBtn.isVisible().catch(() => false)) {
            await nextBtn.click();
            await page.waitForTimeout(2000);
          }
        }
      }

      const rows = page.locator("table tbody tr");
      const count = await rows.count();
      const pageArticles: { id: string; title: string; publicUrl: string; editUrl: string }[] = [];

      // Leer los artículos visibles en esta página
      for (let i = 0; i < count; i++) {
        const row = rows.nth(i);
        
        const idText = ((await row.locator("input[name='checkbox[]']").getAttribute("value").catch(() => "")) || "").trim();
        const titleText = (await row.locator("td").nth(3).innerText().catch(() => "")).trim();

        const consultLink = row.locator("a.consultar").first();
        const href = (await consultLink.getAttribute("href").catch(() => "")) || null;

        if (idText && titleText && idText !== "Loading...") {
          pageArticles.push({
            id: idText,
            title: titleText,
            publicUrl: href || "",
            editUrl: `${baseUrl}/dashboard/direct-edit-articles?articles_id_=${idText}`,
          });
        }
      }

      await onStep(`Detectados ${pageArticles.length} artículos en la página ${pageNum}. Analizando al vuelo...`);

      // Procesar los artículos de esta página uno a uno
      for (let idx = 0; idx < pageArticles.length; idx++) {
        if (successCount >= MAX_REPAIRS_PER_RUN) {
          break;
        }

        const article = pageArticles[idx];
        const progressPrefix = `[Art. ${article.id}]`;

        if (article.id !== TARGET_ARTICLE_ID) continue;

        try {
          await page.goto(article.editUrl, { waitUntil: "domcontentloaded" });

          // El editor textarea real para español es "contentes". Lo buscamos y esperamos a que se adjunte (puede estar oculto por TinyMCE)
          const editorTextarea = page.locator('textarea[name="contentes"], textarea[name="content"]').first();
          await editorTextarea.waitFor({ state: "attached", timeout: 15000 }).catch(() => {});

          if (await editorTextarea.count() === 0) {
            await onStep(`${progressPrefix} Saltar: No se localizó el textarea 'contentes' para "${article.title}"`);
            continue;
          }

          // Leer el valor directamente mediante JS en el navegador para evitar problemas si está oculto
          let contentHtml = await editorTextarea.inputValue();

          if (
            contentHtml.includes("PHONE_NUMBER") ||
            contentHtml.includes("19546529929")
          ) {
            await onStep(`${progressPrefix} Reparando: "${article.title}"...`);

            const repaired = replacePhonePlaceholders(contentHtml, "+19546529929");
            if (repaired.replacements.whatsapp < 2 || repaired.replacements.call < 1) {
              throw new Error(
                `Validación abortada: se esperaban al menos 2 enlaces de WhatsApp/QR y 1 de llamada; se detectaron ${repaired.replacements.whatsapp} y ${repaired.replacements.call}.`,
              );
            }
            contentHtml = repaired.html;

            // Escribir el nuevo contenido tanto en el textarea original como en TinyMCE si está presente
            await page.evaluate(({ val }) => {
              const el = document.querySelector('textarea[name="contentes"], textarea[name="content"]') as HTMLTextAreaElement;
              if (el) {
                el.value = val;
                el.dispatchEvent(new Event("change", { bubbles: true }));
              }
              // Sincronizar con TinyMCE si está cargado en la página
              const tiny = (window as any).tinyMCE;
              if (tiny && tiny.activeEditor) {
                tiny.activeEditor.setContent(val);
              }
            }, { val: contentHtml });

            // Clic en Guardar
            const saveBtn = page.getByRole("button", { name: /Guardar cambios|Save changes|Guardar/i }).first();
            if (await saveBtn.isVisible()) {
              await saveBtn.click();
              await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
              await page.goto(article.editUrl, { waitUntil: "domcontentloaded" });
              const savedTextarea = page
                .locator('textarea[name="contentes"], textarea[name="content"]')
                .first();
              await savedTextarea.waitFor({ state: "attached", timeout: 15000 });
              const savedHtml = await savedTextarea.inputValue();
              const verified = replacePhonePlaceholders(savedHtml, "+19546529929");
              if (
                savedHtml.includes("PHONE_NUMBER") ||
                verified.html !== savedHtml ||
                verified.replacements.whatsapp < 2 ||
                verified.replacements.call < 1
              ) {
                throw new Error(
                  "La verificación posterior al guardado no confirmó los 2 enlaces de WhatsApp/QR y el enlace de llamada.",
                );
              }
              successCount++;
              await onStep(`✓ ¡Reparado con éxito! (${successCount} de ${MAX_REPAIRS_PER_RUN}): ${article.title} — Enlace: ${article.publicUrl || article.editUrl}`);
            } else {
              await onStep(`${progressPrefix} Error: Botón Guardar no encontrado.`);
            }
          } else {
            skippedCount++;
            if (skippedCount % 5 === 0 || idx === pageArticles.length - 1) {
              await onStep(`... analizados ${skippedCount} artículos ya corregidos`);
            }
          }
        } catch (articleErr) {
          await onStep(`${progressPrefix} Error en artículo "${article.title}": ${articleErr instanceof Error ? articleErr.message : String(articleErr)}`);
        }
      }

      // Si ya alcanzamos el límite de reparación, terminamos el loop
      if (successCount >= MAX_REPAIRS_PER_RUN) {
        await onStep(`\nLímite de prueba alcanzado: ${successCount} artículo reparado con éxito.`);
        await onStep("El proceso se ha completado de forma controlada. Revisa el artículo reparado arriba para validar el resultado.");
        break;
      }

      // Si terminamos la página y no logramos el límite, buscamos si hay página siguiente
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

    if (successCount === 0) {
      throw new Error(`No se pudo reparar el artículo objetivo ${TARGET_ARTICLE_ID}.`);
    }

    await onStep(`\n🎉 PROCESO COMPLETADO: ${successCount} artículos corregidos, ${skippedCount} ya estaban corregidos.`);

  } catch (err) {
    await onStep(`Error general: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  } finally {
    await browser.close();
    await onStep("Proceso finalizado.");
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
