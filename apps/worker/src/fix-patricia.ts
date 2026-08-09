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

  const MAX_REPAIRS_PER_RUN = 20;
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let processedCount = 0;
  let lastRepaired: { id: string; title: string } | null = null;
  const failedArticles: { id: string; title: string }[] = [];

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
    while (hasNextPage && processedCount < MAX_REPAIRS_PER_RUN) {
      await onStep(`Abriendo página ${pageNum} de la lista de artículos...`);
      await page.goto(`${baseUrl}/dashboard/user_buyer_seller_articles.php`, {
        waitUntil: "domcontentloaded",
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

      const count = await page.locator("table tbody tr").count();

      // Tomar una sola fila, terminar completamente ese artículo y solo
      // entonces volver a la lista para tomar la fila siguiente.
      for (let idx = 0; idx < count; idx++) {
        if (processedCount >= MAX_REPAIRS_PER_RUN) {
          break;
        }

        if (idx > 0) {
          await page.goto(`${baseUrl}/dashboard/user_buyer_seller_articles.php`, {
            waitUntil: "domcontentloaded",
          });
          await page.waitForSelector("table tbody tr td", { timeout: 15000 });
          for (let p = 1; p < pageNum; p++) {
            const nextBtn = page.locator("a.next, li.next a, button.next").first();
            if (await nextBtn.isVisible().catch(() => false)) {
              await nextBtn.click();
              await page.waitForTimeout(2000);
            }
          }
        }

        const row = page.locator("table tbody tr").nth(idx);
        const id = ((await row.locator("input[name='checkbox[]']").getAttribute("value").catch(() => "")) || "").trim();
        const title = (await row.locator("td").nth(3).innerText().catch(() => "")).trim();
        const publicUrl = (await row.locator("a.consultar").first().getAttribute("href").catch(() => "")) || "";
        if (!id || !title || id === "Loading...") continue;

        const article = {
          id,
          title,
          publicUrl,
          editUrl: `${baseUrl}/dashboard/direct-edit-articles?articles_id_=${id}`,
        };
        const progressPrefix = `[Art. ${article.id}]`;
        processedCount++;

        try {
          await onStep(`${progressPrefix} Abriendo: "${article.title}"...`);
          await page.goto(article.editUrl, { waitUntil: "domcontentloaded" });

          // El editor textarea real para español es "contentes". Lo buscamos y esperamos a que se adjunte (puede estar oculto por TinyMCE)
          const editorTextarea = page.locator('textarea[name="contentes"], textarea[name="content"]').first();
          await editorTextarea.waitFor({ state: "attached", timeout: 15000 }).catch(() => {});

          if (await editorTextarea.count() === 0) {
            throw new Error("No se localizó el editor de contenido.");
          }

          // Leer el valor directamente mediante JS en el navegador para evitar problemas si está oculto
          let contentHtml = await editorTextarea.inputValue();

          if (
            contentHtml.includes("PHONE_NUMBER") ||
            contentHtml.includes("NUMERO-WHATSAPP") ||
            contentHtml.includes("19546529929")
          ) {
            await onStep(`${progressPrefix} Reparando: "${article.title}"...`);

            const repaired = replacePhonePlaceholders(contentHtml, "+19546529929");
            if (
              repaired.html === contentHtml &&
              !contentHtml.includes("PHONE_NUMBER") &&
              !contentHtml.includes("NUMERO-WHATSAPP")
            ) {
              skippedCount++;
              await onStep(`${progressPrefix} Ya estaba correcto. Continuando al siguiente artículo.`);
              continue;
            }
            contentHtml = repaired.html;

            // Escribir el nuevo contenido tanto en el textarea original como en TinyMCE si está presente
            await page.evaluate(({ val }) => {
              const el = document.querySelector('textarea[name="contentes"], textarea[name="content"]') as HTMLTextAreaElement;
              if (el) {
                el.value = val;
                el.dispatchEvent(new Event("change", { bubbles: true }));
              }
              // Este es exactamente el mecanismo que sí guardó el artículo
              // 89325 durante la prueba individual validada por Milton.
              const tiny = (window as any).tinyMCE;
              if (tiny && tiny.activeEditor) {
                tiny.activeEditor.setContent(val);
              }
            }, { val: contentHtml });

            // Clic en Guardar
            const saveBtn = page.getByRole("button", { name: /Guardar cambios|Save changes|Guardar/i }).first();
            if (await saveBtn.isVisible()) {
              await onStep(`${progressPrefix} Contenido corregido. Guardando...`);
              await saveBtn.click();
              await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
              await onStep(`${progressPrefix} Guardado enviado. Verificando el contenido persistido...`);
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
                throw new Error(
                  "La verificación posterior detectó un marcador o enlace telefónico que todavía requiere corrección.",
                );
              }
              successCount++;
              lastRepaired = { id: article.id, title: article.title };
              await onStep(`✓ ¡Reparado con éxito! (${successCount} de ${MAX_REPAIRS_PER_RUN}): ${article.title} — Enlace: ${article.publicUrl || article.editUrl}`);
            } else {
              throw new Error("No se encontró el botón Guardar.");
            }
          } else {
            skippedCount++;
            await onStep(`${progressPrefix} Ya estaba correcto. Continuando al siguiente artículo.`);
          }
        } catch (articleErr) {
          errorCount++;
          failedArticles.push({ id: article.id, title: article.title });
          await onStep(`${progressPrefix} Error en artículo "${article.title}": ${articleErr instanceof Error ? articleErr.message : String(articleErr)}`);
          await onStep(`${progressPrefix} Fallo registrado. Continuando con el siguiente artículo.`);
        }
      }

      // Cada lote procesa como máximo 20 artículos, sin ocultar fallos ni
      // quedarse reintentando el mismo artículo dentro de la misma orden.
      if (processedCount >= MAX_REPAIRS_PER_RUN) {
        await onStep(`\nLímite del lote alcanzado: ${processedCount} artículos procesados uno por uno.`);
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

    if (lastRepaired) {
      await onStep(
        `PUNTO DE PARADA: artículo ${lastRepaired.id} — ${lastRepaired.title}. El próximo lote saltará los artículos correctos y continuará con el siguiente pendiente.`,
      );
    } else if (errorCount === 0) {
      await onStep("SIN PENDIENTES: no se encontraron más artículos que requieran esta reparación.");
    }

    await onStep(`\nLOTE COMPLETADO: ${successCount} reparados, ${skippedCount} ya correctos, ${errorCount} con error.`);
    if (failedArticles.length > 0) {
      await onStep(
        `PENDIENTES PARA REINTENTAR: ${failedArticles.map((article) => `${article.id} — ${article.title}`).join(" | ")}`,
      );
    }
    return { repaired: successCount, alreadyCorrect: skippedCount, failed: errorCount };

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
