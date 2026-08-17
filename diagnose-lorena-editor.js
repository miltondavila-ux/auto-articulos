#!/usr/bin/env node
/**
 * Diagnóstico del editor de contenido en la cuenta de Lorena.
 * Ejecutar desde la raíz del proyecto con DATABASE_URL configurada.
 */
const { PrismaClient } = require('@prisma/client');
const { chromium } = require('playwright');
const { decryptSecret } = require('@auto-articulos/shared');

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email: 'lorenalvarez30@gmail.com' } });
    if (!user) { console.log('Usuario no encontrado'); return; }

    const cred = await prisma.credential.findUnique({
      where: { userId_platform: { userId: user.id, platform: '10minutesWebsite' } }
    });
    if (!cred) { console.log('Sin credenciales'); return; }

    const username = decryptSecret(cred.encryptedUsername);
    const password = decryptSecret(cred.encryptedPassword);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Login
    await page.goto('https://10minuteswebsite.net/dashboard/start.php', { waitUntil: 'domcontentloaded' });
    const enLink = page.getByText('en', { exact: true });
    if (await enLink.isVisible().catch(() => false)) { await enLink.click(); await page.waitForLoadState('domcontentloaded'); }
    await page.getByText('Using your Email + Password', { exact: true }).click();
    await page.fill('input[name="email"]', username);
    await page.fill('input[name="password"]', password);
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.waitForSelector('a[href="user_buyer_seller_articles.php"]', { timeout: 30000 });

    // Ir al formulario
    await page.goto('https://10minuteswebsite.net/dashboard/direct-articles', { waitUntil: 'domcontentloaded' });
    await page.selectOption('#type', '2', { timeout: 30000 });
    const firstCat = await page.locator('#user_label_list_article option').first().getAttribute('value');
    if (firstCat) {
      await page.selectOption('#user_label_list_article', firstCat);
      await page.dispatchEvent('#user_label_list_article', 'change');
    }

    // Extracción completa de info del formulario
    const info = await page.evaluate(() => {
      const result = { textareas: [], contenteditables: [], iframes: [], scripts: [], editorHint: null };

      document.querySelectorAll('textarea').forEach(t => {
        result.textareas.push({
          id: t.id || '',
          name: t.name || '',
          valueLen: t.value?.length ?? 0,
          rows: t.rows,
          visible: t.offsetParent !== null,
          classes: t.className.slice(0, 100),
          placeholder: t.placeholder || ''
        });
      });

      document.querySelectorAll('[contenteditable="true"]').forEach(el => {
        result.contenteditables.push({
          tag: el.tagName,
          id: el.id || '',
          innerHTMLLen: el.innerHTML?.length ?? 0,
          classes: (el.className || '').toString().slice(0, 100)
        });
      });

      document.querySelectorAll('iframe').forEach(f => {
        result.iframes.push({
          id: f.id || '',
          src: (f.src || '').slice(0, 150),
          className: f.className.slice(0, 100)
        });
      });

      // Buscar scripts que mencionen editores
      const scripts = Array.from(document.querySelectorAll("script"));
      for (const s of scripts) {
        if (s.textContent && /tinymce|ckeditor|quill|codemirror| slate|froala|summernote|trumbowyg/i.test(s.textContent)) {
          result.scripts.push(s.textContent.slice(0, 500));
        }
      }

      // Buscar el label "Editor de Texto Enriquecido" para encontrar el textarea asociado
      const allLabels = Array.from(document.querySelectorAll("label, [class*='label'], .label'));
      for (const label of allLabels) {
        if (/editor.*texto.*enriquecido|editor.*rich.*text/i.test(label.textContent || '')) {
          const forAttr = label.getAttribute('for');
          const parent = label.closest('div, .input-field, .row');
          const textareaInParent = parent?.querySelector('textarea, [contenteditable]');
          result.editorHint = {
            labelFor: forAttr,
            labelId: label.id,
            textareaInParentId: textareaInParent?.id || '',
            textareaInParentTag: textareaInParent?.tagName || '',
            parentHTML: parent?.innerHTML?.slice(0, 500) || ''
          };
        }
      }

      // También buscar por el ID parcial "contentes" que aparece en el error
      const allEls = document.querySelectorAll('*');
      for (const el of allEls) {
        if (el.id && /contentes/i.test(el.id)) {
          result.editorHint = result.editorHint || {};
          result.editorHint.foundByContentes = { id: el.id, tag: el.tagName, value: (el as any).value?.slice(0, 200) || '' };
        }
      }

      return result;
    });

    console.log(JSON.stringify(info, null, 2));

    // Ahora: abrir modal, generar, hacer clic en "Usar contenido", y ver qué pasó
    await page.getByRole('button', { name: /Usar ChatGPT/i }).click();
    const dialog = page.locator('.modal', { hasText: /Generador de artículos|AI Article/i });
    await dialog.waitFor({ state: 'visible', timeout: 30000 });

    await dialog.locator('textarea').first().fill('Título de prueba diagnóstico');
    await dialog.getByRole('button', { name: /Generar/i }).click();
    await page.waitForTimeout(25000); // Esperar generación

    // Guardar el contenido del modal antes de "Usar contenido"
    const modalContent = await dialog.locator('textarea').nth(1).inputValue().catch(() => '');
    console.log('\n=== CONTENIDO DEL MODAL (textarea #1, el contenido) ===');
    console.log(`Longitud: ${modalContent.length} chars`);
    console.log(`Preview: ${modalContent.slice(0, 200)}`);

    // Hacer clic en "Usar contenido"
    await dialog.getByRole('button', { name: /Usar contenido/i }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Verificar qué textareas tienen contenido ahora
    const afterUseContent = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('textarea')).map(t => ({
        id: t.id,
        name: t.name,
        valueLen: t.value?.length ?? 0,
        valuePreview: t.value?.slice(0, 150) || '',
        visible: t.offsetParent !== null
      }));
    });
    console.log('\n=== DESPUÉS DE "Usar contenido" ===');
    console.log(JSON.stringify(afterUseContent, null, 2));

    // Verificar si "Guardar cambios" está habilitado
    const saveBtnState = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b =>
        /guardar cambios|save changes/i.test(b.textContent || "")
      ) as HTMLButtonElement | undefined;
      return {
        found: !!btn,
        disabled: btn?.disabled || false,
        classList: btn ? Array.from(btn.classList) : [],
        text: btn?.textContent?.trim()
      };
    });
    console.log('\n=== ESTADO DEL BOTÓN GUARDAR ===');
    console.log(JSON.stringify(saveBtnState, null, 2));

    // Buscar mensajes de error visibles
    const errorMsgs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[class*="error"], [class*="invalid"], [role="alert"], .red-text, .invalid'))
        .filter(el => (el as HTMLElement).offsetParent !== null)
        .map(el => ({
          classes: el.className.slice(0, 100),
          text: (el.textContent || '').trim().slice(0, 200)
        }));
    });
    console.log('\n=== MENSAJES DE ERROR VISIBLES ===');
    console.log(JSON.stringify(errorMsgs, null, 2));

    await browser.close();
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
