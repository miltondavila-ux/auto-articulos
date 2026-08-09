import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";
import { chromium } from "playwright";
import dotenv from "dotenv";

dotenv.config();


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
  const baseUrl = `https://www.10minuteswebsite.${domain}`;

  console.log(`Conectando a 10minutesWebsite (${baseUrl}) como ${username}...`);

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
    console.log("Sesión iniciada correctamente.");

    // 2. Ir al listado de artículos
    await page.goto(`${baseUrl}/dashboard/user_buyer_seller_articles.php`, { waitUntil: "domcontentloaded" });
    console.log("Abierto el listado de artículos.");

    // Cambiar la cantidad de filas a 100 para cargar todo en una sola página si es posible
    const lengthSelect = page.locator('select[name="example_length"]');
    if (await lengthSelect.isVisible()) {
      await lengthSelect.selectOption("100").catch(() => {});
      await page.waitForTimeout(2000);
      console.log("Filas del listado configuradas a 100.");
    }

    // Leer todas las filas
    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    console.log(`Encontradas ${count} filas en el listado de artículos.`);

    const articlesToEdit: { title: string; viewUrl: string }[] = [];

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const titleLink = row.locator("td").nth(2); // La tercera columna suele ser el título
      const titleText = (await titleLink.innerText().catch(() => "")).trim();

      const consultLink = row.locator("a.consultar").first();
      const href = await consultLink.getAttribute("href").catch(() => null);

      if (titleText && href) {
        articlesToEdit.push({
          title: titleText,
          viewUrl: href.startsWith("http") ? href : `${baseUrl}/dashboard/${href}`,
        });
      }
    }

    console.log(`Se encontraron ${articlesToEdit.length} artículos válidos para revisar.`);

    // 3. Procesar cada artículo
    for (let idx = 0; idx < articlesToEdit.length; idx++) {
      const article = articlesToEdit[idx];
      console.log(`\n[${idx + 1}/${articlesToEdit.length}] Procesando artículo: "${article.title}"`);
      
      try {
        // Ir a la página de consulta/vista
        await page.goto(article.viewUrl, { waitUntil: "domcontentloaded" });
        console.log(`- Abierta vista de consulta: ${article.viewUrl}`);

        // Buscar si hay un botón de edición en la página
        // A veces se llama "Editar artículo" o tiene un href a direct-articles con id
        const editLink = page.locator('a[href*="direct-articles?id="], a[href*="direct-articles.php?id="], a:has-text("Edit"), a:has-text("Editar")').first();
        
        let editUrl = await editLink.getAttribute("href").catch(() => null);
        if (!editUrl) {
          // Intentar construir el edit URL si la URL de consulta tiene un id
          // Ej: user_buyer_seller_articles.php?action=consultar&id=123 => direct-articles?id=123
          const match = article.viewUrl.match(/[?&]id=(\d+)/);
          if (match && match[1]) {
            editUrl = `${baseUrl}/dashboard/direct-articles?id=${match[1]}`;
          }
        }

        if (!editUrl) {
          console.warn(`- No se pudo determinar el enlace de edición para: "${article.title}"`);
          continue;
        }

        const finalEditUrl = editUrl.startsWith("http") ? editUrl : `${baseUrl}/dashboard/${editUrl}`;
        console.log(`- Abriendo página de edición: ${finalEditUrl}`);
        
        await page.goto(finalEditUrl, { waitUntil: "domcontentloaded" });

        // Esperar a que cargue el formulario de edición
        const editorTextarea = page.locator('textarea[name="content"], textarea#respose_content, textarea#editor, textarea.editor').first();
        if (!(await editorTextarea.isVisible())) {
          console.warn("- No se encontró el campo de contenido/editor en esta página.");
          continue;
        }

        // Obtener el valor actual del contenido
        let contentHtml = await editorTextarea.inputValue();
        
        // Verificar si contiene "PHONE_NUMBER"
        if (contentHtml.includes("PHONE_NUMBER")) {
          console.log("- Detectado placeholder 'PHONE_NUMBER'. Reemplazando por '+19546529929'...");
          
          // Reemplazar todas las ocurrencias
          contentHtml = contentHtml.replace(/PHONE_NUMBER/g, "+19546529929");

          // Escribir el nuevo contenido en el editor
          await editorTextarea.evaluate((el, val) => {
            (el as HTMLTextAreaElement).value = val;
            // Disparar evento change por seguridad
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }, contentHtml);

          // Guardar los cambios
          const saveBtn = page.getByRole("button", { name: /Guardar cambios|Save changes|Guardar/i }).first();
          if (await saveBtn.isVisible()) {
            await saveBtn.click();
            await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
            console.log(`✓ Artículo "${article.title}" actualizado con éxito.`);
          } else {
            console.warn("- No se encontró el botón de Guardar cambios.");
          }
        } else {
          console.log("- El artículo no contiene el placeholder 'PHONE_NUMBER'. No requiere cambios.");
        }
      } catch (articleErr) {
        console.error(`- Error procesando artículo "${article.title}":`, articleErr);
      }
    }

  } catch (err) {
    console.error("Error general en el proceso de Playwright:", err);
  } finally {
    await browser.close();
    console.log("\nProceso finalizado.");
  }
}

main()
  .catch((err) => {
    console.error("Error fatal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
