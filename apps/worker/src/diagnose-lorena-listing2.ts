import "dotenv/config";
import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";
import { chromium } from "playwright";

// Diagnostico puntual (15/8/2026), segunda vuelta: la primera version de
// este chequeo esperaba muy poco y la tabla seguia en "Loading...". Esta
// vez espera de verdad (red inactiva + hasta 20s a que la primera fila
// tenga contenido real) antes de mirar o buscar.
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

  await page.goto(
    "https://10minuteswebsite.net/dashboard/user_buyer_seller_articles.php",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});

  await page
    .waitForFunction(
      () => {
        const tables = Array.from(document.querySelectorAll("table"));
        return tables.some((t) => {
          const firstCell = t.querySelector("tbody tr td");
          const text = (firstCell?.textContent ?? "").trim();
          return text.length > 0 && !/loading/i.test(text);
        });
      },
      undefined,
      { timeout: 20000 },
    )
    .catch((e) => console.log("waitForFunction timeout:", e.message));

  const tableCount = await page.evaluate(() => document.querySelectorAll("table").length);
  console.log(`Cantidad de <table> en la página: ${tableCount}`);

  const allTablesFirstRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("table")).map((t, i) => {
      const rows = Array.from(t.querySelectorAll("tbody tr")).slice(0, 3);
      return {
        tableIndex: i,
        id: t.id || null,
        class: t.className || null,
        rowCount: t.querySelectorAll("tbody tr").length,
        firstRows: rows.map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => (td.textContent || "").trim().slice(0, 60))),
      };
    });
  });
  console.log("=== Todas las tablas de la página ===");
  console.log(JSON.stringify(allTablesFirstRows, null, 2));

  await page.evaluate(() => {
    const jq = (window as unknown as { jQuery?: (s: string) => { DataTable: () => { search: (s: string) => { draw: () => void } } } }).jQuery;
    jq?.("table").DataTable().search("Seguro de Salud Prenatal").draw();
  });
  await page.waitForTimeout(1500);
  const filtered = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("table tbody tr"))
      .slice(0, 10)
      .map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => (td.textContent || "").trim().slice(0, 100)));
  });
  console.log('\n=== Filas al buscar "Seguro de Salud Prenatal" ===');
  console.log(JSON.stringify(filtered, null, 2));

  const firstRowLinks = await page.evaluate(() => {
    const row = document.querySelector("table tbody tr");
    if (!row) return null;
    const links = Array.from(row.querySelectorAll("a")).map((a) => ({
      class: a.className,
      href: a.getAttribute("href"),
      text: (a.textContent || "").trim().slice(0, 40),
    }));
    return { rowHTML: row.innerHTML.slice(0, 3000), links };
  });
  console.log("\n=== Links y HTML de la primera fila ===");
  console.log(JSON.stringify(firstRowLinks, null, 2));

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
