import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
// ── /works: wait longer, count real rows ──
let page = await browser.newPage();
await page.goto("http://127.0.0.1:3000/works", { waitUntil: "networkidle2", timeout: 60000 });
await new Promise((r) => setTimeout(r, 5000));
const w = await page.evaluate(() => ({
  rows: document.querySelectorAll("table tbody tr").length,
  text: document.body.innerText.slice(0, 400),
}));
console.log("WORKS: rows =", w.rows, "| headline:", w.text.split("\n").slice(0, 8).join(" ⏎ ").slice(0, 300));
await page.close();
// ── /ledger: what does it actually show? ──
page = await browser.newPage();
await page.goto("http://127.0.0.1:3000/ledger", { waitUntil: "networkidle2", timeout: 60000 });
await new Promise((r) => setTimeout(r, 3000));
const l = await page.evaluate(() => document.body.innerText.slice(0, 700));
console.log("LEDGER text sample:", l.split("\n").slice(0, 12).join(" ⏎ ").slice(0, 400));
const mode = await page.evaluate(() => {
  const t = document.body.innerText;
  return { hasLive: /live/i.test(t), hasGenesis: t.includes("genesis"), blocks: document.querySelectorAll("table tbody tr").length };
});
console.log("LEDGER checks:", JSON.stringify(mode));
await page.close();
await browser.close();
