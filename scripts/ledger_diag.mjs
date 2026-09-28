/* Diagnose the mutation-button click: DOM click, editor-row detection, 500 URL. */
import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1680, height: 1100 });
const errors = [];
const badResponses = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("response", (r) => {
  if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
});
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto("http://localhost:3000/ledger", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => document.querySelectorAll("tbody tr").length > 0, { timeout: 45000 });
await sleep(1200);

const before = await page.evaluate(() => document.querySelectorAll("tbody tr").length);
console.log("rows before:", before);

// DOM-level click on the first enabled mutation button.
const clicked = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button[aria-label^="Simulate direct DB mutation"]')].find(
    (b) => !b.disabled
  );
  if (!btn) return null;
  const label = btn.getAttribute("aria-label");
  btn.click();
  return label;
});
console.log("clicked:", clicked);
await sleep(1200);

const after = await page.evaluate(() => ({
  rowsAfter: document.querySelectorAll("tbody tr").length,
  editorRows: document.querySelectorAll("tr.bg-amber-50").length,
  textareas: document.querySelectorAll("textarea").length,
  toast: (document.querySelector('[role="status"]')?.textContent ?? "").slice(0, 140),
  bodyHasEditorHeader: [...document.querySelectorAll("span")].some(
    (s) => s.textContent === "Simulate Direct DB Mutation"
  ),
}));
console.log("AFTER:", JSON.stringify(after, null, 2));
console.log("HTTP >= 400:", badResponses.slice(0, 6));
console.log("JS errors:", errors.slice(0, 6));
await browser.close();
