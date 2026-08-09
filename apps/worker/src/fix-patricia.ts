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
    await onStep("Abierto el listado de artículos.");

    // Cambiar la cantidad de filas a 100 para cargar todo en una sola página si es posible
    const lengthSelect = page.locator('select[name="example_length"]');
    if (await lengthSelect.isVisible()) {
      await lengthSelect.selectOption("100").catch(() => {});
      await page.waitForTimeout(2000);
      await onStep("Filas del listado configuradas a 100.");
    }

    // Leer todas las filas
    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    await onStep(`Encontradas ${count} filas en la tabla del listado.`);

    const articlesToEdit: { id: string; title: string; publicUrl: string; editUrl: string }[] = [];

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      
      // Primera columna es el ID del artículo
      const idText = (await row.locator("td").first().innerText().catch(() => "")).trim();
      
      // Tercera columna es el Título
      const titleLink = row.locator("td").nth(2);
      const titleText = (await titleLink.innerText().catch(() => "")).trim();

      // Enlace de consulta (a.consultar) suele ser la URL pública del artículo
      const consultLink = row.locator("a.consultar").first();
      const href = await consultLink.getAttribute("href").catch(() => null);

      if (idText && titleText) {
        articlesToEdit.push({
          id: idText,
          title: titleText,
          publicUrl: href || "",
          editUrl: `${baseUrl}/dashboard/direct-articles?id=${idText}`,
        });
      }
    }

    await onStep(`Se identificaron ${articlesToEdit.length} artículos en total para revisar.`);

    let successCount = 0;
    let skippedCount = 0;

    // 3. Procesar cada artículo
    for (let idx = 0; idx < articlesToEdit.length; idx++) {
      const article = articlesToEdit[idx];
      const progressPrefix = `[${idx + 1}/${articlesToEdit.length}]`;
      
      try {
        await page.goto(article.editUrl, { waitUntil: "domcontentloaded" });

        // Esperar a que cargue el formulario de edición
        const editorTextarea = page.locator('textarea[name="content"], textarea#respose_content, textarea#editor, textarea.editor').first();
        if (!(await editorTextarea.isVisible())) {
          await onStep(`${progressPrefix} Saltar: No se encontró el editor para "${article.title}" (ID: ${article.id})`);
          continue;
        }

        // Obtener el valor actual del contenido
        let contentHtml = await editorTextarea.inputValue();
        
        // Verificar si contiene "PHONE_NUMBER"
        if (contentHtml.includes("PHONE_NUMBER")) {
          await onStep(`${progressPrefix} Reparando: "${article.title}"...`);
          
          contentHtml = contentHtml.replace(/PHONE_NUMBER/g, "+19546529929");

          // Escribir el nuevo contenido en el editor
          await editorTextarea.evaluate((el, val) => {
            (el as HTMLTextAreaElement).value = val;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }, contentHtml);

          // Guardar los cambios
          const saveBtn = page.getByRole("button", { name: /Guardar cambios|Save changes|Guardar/i }).first();
          if (await saveBtn.isVisible()) {
            await saveBtn.click();
            await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
            successCount++;
            await onStep(`✓ Reparado con éxito (${successCount} de ${articlesToEdit.length}): ${article.title} — Enlace: ${article.publicUrl || article.editUrl}`);
          } else {
            await onStep(`${progressPrefix} Error: No se encontró botón Guardar para "${article.title}"`);
          }
        } else {
          skippedCount++;
          // No requiere cambios
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
