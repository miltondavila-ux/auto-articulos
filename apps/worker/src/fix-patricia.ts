import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";
import { chromium } from "playwright";
import dotenv from "dotenv";

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

    // 2. Ir al listado de artículos
    await page.goto(`${baseUrl}/dashboard/user_buyer_seller_articles.php`, { waitUntil: "domcontentloaded" });
    await onStep("Abierto el listado de artículos. Esperando a que cargue la tabla...");

    // Esperar a que la tabla cargue y el indicador de "Loading..." o "Cargando..." desaparezca de las celdas
    await page.waitForSelector("table tbody tr td", { timeout: 25000 });
    await page.waitForFunction(() => {
      const cell = document.querySelector("table tbody tr td");
      if (!cell) return false;
      const text = cell.textContent || "";
      return !text.toLowerCase().includes("loading") && !text.toLowerCase().includes("cargando");
    }, { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const firstCellText = await page.locator("table tbody tr td").first().innerText().catch(() => "");
    if (
      firstCellText.includes("No data") ||
      firstCellText.includes("No se encontraron") ||
      firstCellText.includes("Ningún dato")
    ) {
      await onStep("La tabla está vacía. Patricia Coy no tiene artículos publicados.");
      return;
    }

    // Configurar cantidad de filas a 100 para reducir el número de páginas a recorrer
    const lengthSelect = page.locator('select[name="example_length"], select[name*="length"]').first();
    if (await lengthSelect.isVisible().catch(() => false)) {
      await lengthSelect.selectOption("100").catch(() => {});
      await page.waitForTimeout(3000); // Esperar a que cargue la tabla con 100 filas
      await onStep("Filas del listado configuradas a 100 por página.");
    }

    const articlesToEdit: { id: string; title: string; publicUrl: string; editUrl: string }[] = [];
    let hasNextPage = true;
    let pageNum = 1;

    // Recorrer todas las páginas de la tabla
    while (hasNextPage) {
      await onStep(`Escaneando artículos en la página ${pageNum}...`);
      await page.waitForSelector("table tbody tr td", { timeout: 15000 });
      await page.waitForFunction(() => {
        const cell = document.querySelector("table tbody tr td");
        if (!cell) return false;
        const text = cell.textContent || "";
        return !text.toLowerCase().includes("loading") && !text.toLowerCase().includes("cargando");
      }, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);

      const rows = page.locator("table tbody tr");
      const count = await rows.count();

      for (let i = 0; i < count; i++) {
        const row = rows.nth(i);
        const idText = (await row.locator("td").first().innerText().catch(() => "")).trim();
        const titleLink = row.locator("td").nth(2);
        const titleText = (await titleLink.innerText().catch(() => "")).trim();

        const consultLink = row.locator("a.consultar").first();
        const href = await consultLink.getAttribute("href").catch(() => null);

        if (idText && titleText && !idText.includes("No data") && !idText.includes("Ningún")) {
          articlesToEdit.push({
            id: idText,
            title: titleText,
            publicUrl: href || "",
            editUrl: `${baseUrl}/dashboard/direct-articles?id=${idText}`,
          });
        }
      }

      // Paginación: buscar el botón de siguiente página
      const nextBtn = page.locator("a.next, li.next a, button.next").first();
      const isNextVisible = await nextBtn.isVisible().catch(() => false);
      const isNextDisabled = await nextBtn.evaluate((el) =>
        el.classList.contains("disabled") ||
        el.getAttribute("aria-disabled") === "true" ||
        (el as HTMLButtonElement).disabled
      ).catch(() => true);

      if (isNextVisible && !isNextDisabled) {
        await nextBtn.click();
        await page.waitForTimeout(2500); // Esperar a que se cargue la siguiente página
        pageNum++;
      } else {
        hasNextPage = false;
      }
    }

    await onStep(`Escaneo finalizado. Se identificaron ${articlesToEdit.length} artículos en total para revisar.`);

    const MAX_REPAIRS_PER_RUN = 10;
    let successCount = 0;
    let skippedCount = 0;

    // 3. Procesar cada artículo uno a uno
    for (let idx = 0; idx < articlesToEdit.length; idx++) {
      if (successCount >= MAX_REPAIRS_PER_RUN) {
        await onStep(`\nLímite de ${MAX_REPAIRS_PER_RUN} artículos reparados alcanzado para este lote.`);
        await onStep("Proceso pausado temporalmente para asegurar estabilidad. Puedes presionar el botón de nuevo para continuar con el siguiente lote de 10.");
        break;
      }

      const article = articlesToEdit[idx];
      const progressPrefix = `[${idx + 1}/${articlesToEdit.length}]`;

      try {
        await page.goto(article.editUrl, { waitUntil: "domcontentloaded" });

        const editorTextarea = page
          .locator('textarea[name="content"], textarea#respose_content, textarea#editor, textarea.editor')
          .first();

        // Esperar a que el editor cargue y sea visible
        await editorTextarea.waitFor({ state: "visible", timeout: 12000 }).catch(() => {});

        if (!(await editorTextarea.isVisible().catch(() => false))) {
          await onStep(`${progressPrefix} Saltar: No se pudo cargar el editor para "${article.title}" (ID: ${article.id})`);
          continue;
        }

        let contentHtml = await editorTextarea.inputValue();

        // Verificar si contiene "PHONE_NUMBER"
        if (contentHtml.includes("PHONE_NUMBER")) {
          await onStep(`${progressPrefix} Reparando: "${article.title}"...`);

          contentHtml = contentHtml.replace(/PHONE_NUMBER/g, "+19546529929");

          // Escribir el nuevo contenido en el editor
          await editorTextarea.evaluate((el, val) => {
            (el as HTMLTextAreaElement).value = val;
            el.dispatchEvent(new Event("change", { bubbles: true }));
          }, contentHtml);

          // Guardar cambios
          const saveBtn = page.getByRole("button", { name: /Guardar cambios|Save changes|Guardar/i }).first();
          if (await saveBtn.isVisible()) {
            await saveBtn.click();
            await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
            successCount++;
            await onStep(`✓ Reparado con éxito (${successCount} de ${articlesToEdit.length}): ${article.title} — Enlace: ${article.publicUrl || article.editUrl}`);
          } else {
            await onStep(`${progressPrefix} Error: No se localizó el botón Guardar para "${article.title}"`);
          }
        } else {
          skippedCount++;
          if (skippedCount % 10 === 0 || idx === articlesToEdit.length - 1) {
            await onStep(`... analizados ${idx + 1}/${articlesToEdit.length} artículos (ya corregidos o sin placeholder)`);
          }
        }
      } catch (articleErr) {
        await onStep(`${progressPrefix} Error en artículo "${article.title}": ${articleErr instanceof Error ? articleErr.message : String(articleErr)}`);
      }
    }

    await onStep(`\n🎉 PROCESO COMPLETADO: ${successCount} artículos corregidos con éxito, ${skippedCount} ya estaban corregidos.`);

  } catch (err) {
    await onStep(`Error general en el proceso de Playwright: ${err instanceof Error ? err.message : String(err)}`);
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

  console.log(`Usuario encontrado: ${user.name} (${user.email})`);

  const credentials = await prisma.credential.findFirst({
    where: { userId: user.id, platform: "10minutesWebsite" },
  });

  if (!credentials) {
    console.error("Error: No se encontraron credenciales de 10minutesWebsite para Patricia.");
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
