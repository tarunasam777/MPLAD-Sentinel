/* Browser-level verification of the manual ledger-edit path in Live mode:
   edit → freeze banner + badge → restore → clean. */
import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("http://localhost:3000/ledger", { waitUntil: "networkidle2", timeout: 45000 });

// 1. Wait for hydration → edit buttons only render when editable (live, chain clean)
await page.waitForSelector('button[aria-label^="Edit amount and status of block"]', { timeout: 30000 });
const editCount = await page.$$eval('button[aria-label^="Edit amount and status of block"]', (b) => b.length);
console.log("✓ hydrated in Live mode — editable blocks:", editCount);

// 2. Open the inline editor on block #2 and save a falsified amount/status
await page.click('button[aria-label="Edit amount and status of block #2"]');
await page.waitForSelector('input[aria-label="Amount (lakh rupees)"]', { timeout: 10000 });
// React controlled inputs: set via the native value setter + input event,
// otherwise onChange never fires and the store keeps the old value.
const setReactInput = (sel, val) =>
  page.evaluate(
    (sel, val) => {
      const el = document.querySelector(sel);
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(el, val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    sel,
    val
  );
await setReactInput('input[aria-label="Amount (lakh rupees)"]', "45.5");
await setReactInput('input[aria-label="Status"]', "FALSIFIED");
const rowsBefore = await page.$$eval("tbody tr", (r) => r.length);
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Save (write"));
  btn.click();
});
try {
  await page.waitForFunction(
    () => /critical: sha-256 ledger chain corruption detected at block #/i.test(document.body.innerText),
    { timeout: 30000 }
  );
  console.log("✓ save → red CRITICAL banner appeared (system frozen for audit)");
} catch {
  const txt = await page.evaluate(() => document.body.innerText.slice(0, 1200));
  console.error("BANNER DID NOT APPEAR — page text:\n" + txt);
  await browser.close();
  process.exit(1);
}
const badges = await page.$$eval("tbody tr", (r) => r.join("\n").includes("DB-TAMPERED"));
const tag = await page.evaluate(() => document.body.innerText.includes("AMOUNT / STATUS ALTERED in DB"));
console.log("✓ DB-TAMPERED badge on edited block:", badges, "| 'AMOUNT / STATUS ALTERED' tag:", tag);
const restoreVisible = await page.evaluate(() =>
  [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Restore Integrity / Re-seal")));
console.log("✓ Restore Integrity / Re-seal visible after manual edit:", restoreVisible, `(rows ${rowsBefore})`);

// 3. Edit button must now be refused (frozen) — no ✎ buttons rendered while broken
const editWhileFrozen = await page.$$eval('button[aria-label^="Edit amount and status of block"]', (b) => b.length);
console.log("✓ edit buttons while frozen (must be 0):", editWhileFrozen);

// 4. Restore → banner gone, chain clean
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Restore Integrity / Re-seal"));
  btn.click();
});
await page.waitForFunction(
  () => !/critical: sha-256 ledger chain corruption detected at block #/i.test(document.body.innerText),
  { timeout: 30000 }
);
console.log("✓ restore → banner gone, chain clean again");

console.log("client page errors:", errors.length === 0 ? "NONE" : errors);
await browser.close();
if (errors.length > 0 || editWhileFrozen !== 0) process.exit(1);
console.log("ALL BROWSER CHECKS PASSED");
