import "dotenv/config";
import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";
import { chromium } from "playwright";

// Diagnóstico puntual (15/8/2026): "Este campo es obligatorio" bloquea el
// guardado en la cuenta de Lorena Álvarez aun con #contentes y #excerptes
// llenos (ver COORDINACION_CLAUDE_CODEX.md). Solo lectura: entra, abre el
// formulario, y lee el JS real de la página para encontrar la validación
// exacta en vez de seguir adivinando. No publica ni guarda nada.
async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "lorenalvarez30@gmail.com" },
    select: { id: true },
  });
  if (!user) {
    console.log("Usuario no encontrado");
    return;
  }
  const cred = await prisma.credential.findUnique({
    where: { userId_platform: { userId: user.id, platform: "10minutesWebsite" } },
    select: { encryptedUsername: true, encryptedPassword: true },
  });
  if (!cred) {
    console.log("Sin credenciales");
    return;
  }
  const username = decryptSecret(cred.encryptedUsername);
  const password = decryptSecret(cred.encryptedPassword);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("https://10minuteswebsite.net/dashboard/start.php", {
    waitUntil: "domcontentloaded",
  });
  const enLink = page.getByText("en", { exact: true });
  if (await enLink.isVisible().catch(() => false)) {
    await enLink.click();
    await page.waitForLoadState("domcontentloaded");
  }
  await page.getByText("Using your Email + Password", { exact: true }).click();
  await page.fill('input[name="email"]', username);
  await page.fill('input[name="password"]', password);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.waitForSelector('a[href="user_buyer_seller_articles.php"]', {
    timeout: 30000,
  });

  await page.goto("https://10minuteswebsite.net/dashboard/direct-articles", {
    waitUntil: "domcontentloaded",
  });
  await page.selectOption("#type", "2", { timeout: 30000 });
  const firstCat = await page
    .locator("#user_label_list_article option")
    .first()
    .getAttribute("value");
  if (firstCat) {
    await page.selectOption("#user_label_list_article", firstCat);
    await page.dispatchEvent("#user_label_list_article", "change");
  }
  await page.waitForTimeout(1500);

  const scriptSources = await page.evaluate(() =>
    Array.from(document.querySelectorAll("script[src]")).map(
      (s) => (s as HTMLScriptElement).src,
    ),
  );
  const inlineScripts = await page.evaluate(() =>
    Array.from(document.querySelectorAll("script:not([src])")).map(
      (s) => s.textContent || "",
    ),
  );

  const fetched: { src: string; text: string }[] = [];
  for (const src of scriptSources) {
    try {
      const resp = await page.request.get(src);
      if (resp.ok()) fetched.push({ src, text: await resp.text() });
    } catch {
      // ignorar scripts que no se puedan traer
    }
  }

  const haystacks = [
    ...inlineScripts.map((text, i) => ({ src: `inline#${i}`, text })),
    ...fetched,
  ];

  console.log("=== Scripts externos detectados ===");
  console.log(scriptSources.join("\n"));

  console.log('\n=== Coincidencias de "obligatorio" / "required" en JS ===');
  for (const { src, text } of haystacks) {
    const re = /obligatorio|is required|required field/gi;
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = re.exec(text)) !== null && count < 5) {
      const idx = m.index;
      const ctx = text
        .slice(Math.max(0, idx - 250), idx + 250)
        .replace(/\s+/g, " ");
      console.log(`--- ${src} @${idx} ---\n${ctx}\n`);
      count++;
    }
  }

  const allFields = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("input, textarea, select"))
      .map((el) => {
        const element = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        const attrs: Record<string, string> = {};
        for (const a of Array.from(element.attributes)) attrs[a.name] = a.value;
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id || null,
          name: element.name || null,
          type: (element as HTMLInputElement).type || null,
          value_len: (element.value || "").length,
          visible: element.offsetParent !== null,
          attrs,
        };
      });
  });
  console.log("\n=== TODOS los campos del formulario ===");
  console.log(JSON.stringify(allFields, null, 2));

  await browser.close();
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
