import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.goto("http://localhost:3000/ledger", { waitUntil: "networkidle2", timeout: 45000 });
await page.waitForFunction(() => /DB-TAMPERED/.test(document.body.innerText), { timeout: 30000 });
const n = await page.evaluate(() => (document.body.innerText.match(/DB-TAMPERED/g) || []).length);
console.log("DB-TAMPERED badges rendered:", n);
await browser.close();
