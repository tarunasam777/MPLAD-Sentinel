import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("hmr")) errors.push(m.text().slice(0, 120)); });
const r = await page.goto("http://127.0.0.1:3000/cases/MPL-2025-1007?from=ledger", { waitUntil: "networkidle2", timeout: 60000 });
await new Promise((res) => setTimeout(res, 3000));
const t = await page.evaluate(() => document.body.innerText.slice(0, 500));
console.log("HTTP", r.status(), "| errors:", errors.length ? errors.join(" | ") : "none");
console.log("content:", t.replace(/\n/g, " ⏎ ").slice(0, 350));
await browser.close();
