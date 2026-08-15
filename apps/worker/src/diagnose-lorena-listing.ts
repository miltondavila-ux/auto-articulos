import "dotenv/config";
import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";
import { chromium } from "playwright";

// Diagnostico puntual (15/8/2026): el guardado dejo de bloquearse
// (sigue en el formulario=false) pero la busqueda posterior por titulo no
// encontro el articulo en 90s. Solo lectura: entra y lista las filas mas
// recientes del listado para confirmar si el articulo se guardo de verdad.
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
  await page.waitForTimeout(2000);

  const rows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("table tbody tr"))
      .slice(0, 15)
      .map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => (td.textContent || "").trim().slice(0, 80)));
  });
  console.log("=== Primeras 15 filas del listado (tal como las ordena el sitio) ===");
  console.log(JSON.stringify(rows, null, 2));

  await page.evaluate(() => {
    const jq = (window as unknown as { jQuery?: (s: string) => { DataTable: () => { search: (s: string) => { draw: () => void } } } }).jQuery;
    jq?.("table").DataTable().search("Guía para elegir").draw();
  });
  await page.waitForTimeout(1000);
  const filtered = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("table tbody tr"))
      .slice(0, 10)
      .map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => (td.textContent || "").trim().slice(0, 80)));
  });
  console.log('\n=== Filas al buscar "Guía para elegir" ===');
  console.log(JSON.stringify(filtered, null, 2));

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
