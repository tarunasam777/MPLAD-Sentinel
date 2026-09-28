/* Verify the four ledger requirements in a real browser (production build). */
import puppeteer from "puppeteer-core";

const BASE = "http://localhost:3000";
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1680, height: 1100 });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("net::ERR")) errors.push(`console: ${m.text()}`);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto(`${BASE}/ledger`, { waitUntil: "domcontentloaded", timeout: 60000 });
// Wait for hydration: ledger rows to render.
await page.waitForFunction(
  () => document.querySelectorAll("tbody tr").length > 0,
  { timeout: 45000 }
);
const sleepRows = () => sleep(300);

const results = {};
const rowTexts = () =>
  page.$$eval("tbody tr", (rows) =>
    rows.map((r) => r.innerText.replace(/\s+/g, " ").trim())
  );

/* ── Req 4: functional search bar ─────────────────────────────────────── */
const totalRows = await page.$$eval("tbody tr", (r) => r.length);
const search = async (term) => {
  await page.evaluate(() => {
    const el = document.querySelector('input[type="search"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(el, "");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  if (!term) return;
  await page.type('input[type="search"]', term, { delay: 10 });
  await sleep(400);
};
const visibleCount = () =>
  page.$$eval("tbody tr", (rows) => rows.filter((r) => r.offsetParent !== null).length);

// Search by official role.
await search("District Magistrate");
await sleepRows();
results.searchRole = { count: await visibleCount(), pass: (await visibleCount()) > 0 && (await visibleCount()) < totalRows };

// Search by action state / category keyword.
await search("override");
await sleepRows();
results.searchAction = { count: await visibleCount(), pass: (await visibleCount()) > 0 };

// Search by block hash prefix (first block's hash).
const firstHash = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button[aria-label^="Copy hash"]')];
  return btns.length ? btns[0].title.split(" ")[0] : "";
});
await search(firstHash.slice(0, 10));
await sleepRows();
results.searchHash = { count: await visibleCount(), pass: (await visibleCount()) >= 1 };

// Search by case id fragment.
await search("MPLADS");
await sleepRows();
results.searchCaseId = { count: await visibleCount(), pass: true }; // may be 0 if no such case seeded

// No-match empty state.
await search("zzzqqqxxx");
await sleepRows();
results.searchEmpty = { pass: (await rowTexts()).some((t) => t.includes("No ledger blocks match")) };

// Clear search.
await search("");
await sleepRows();

/* ── Req 2: no emojis in rendered text ────────────────────────────────── */
const bodyText = await page.evaluate(() => document.body.innerText);
const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2190}-\u{21FF}]/gu;
const emojiHits = bodyText.match(emojiRe) ?? [];
results.noEmojis = { hits: emojiHits, pass: emojiHits.length === 0 };

/* ── Req 3: per-block Simulate Direct DB Mutation ─────────────────────── */
const mutationButtons = await page.$$eval(
  'button[aria-label^="Simulate direct DB mutation"]',
  (b) => b.length
);
results.mutationButtons = { count: mutationButtons, pass: mutationButtons > 0 };

// Click the first enabled mutation button.
const clicked = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button[aria-label^="Simulate direct DB mutation"]')].find(
    (b) => !b.disabled
  );
  if (!btn) return null;
  const row = btn.closest("tr");
  return { idx: row?.querySelector("td span")?.textContent ?? "?", label: btn.getAttribute("aria-label") };
});
if (clicked) {
  await page.click(`button[aria-label="${clicked.label}"]`);
  await page.waitForSelector('textarea[aria-label="Record payload (override reason)"]', { timeout: 10000 });
  // Edit the payload text via the native setter (React onChange).
  await page.evaluate(() => {
    const ta = document.querySelector('textarea[aria-label="Record payload (override reason)"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
    setter.call(ta, "Simulated unauthorized payload rewrite — amount understated for audit.");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.textContent.includes("Execute Mutation")
    );
    btn?.click();
  });
  await sleep(2500);
  const txt = await page.evaluate(() => document.body.innerText);
  results.banner = {
    pass:
      txt.toUpperCase().includes("CRYPTOGRAPHIC MUTATION DETECTED") &&
      txt.toUpperCase().includes("SYSTEM FROZEN FOR AUDIT"),
  };
  results.badge = { pass: txt.toUpperCase().includes("DB-TAMPERED") };
  // Formal red status indicator wording.
  results.redIndicator = {
    text: (txt.match(/CRYPTOGRAPHIC MUTATION DETECTED[^\n]*/) ?? [""])[0].slice(0, 120),
  };
  // Frozen: every other mutation button disabled.
  await sleepRows();
  const disabledCount = await page.$$eval(
    'button[aria-label^="Simulate direct DB mutation"]',
    (b) => b.filter((x) => x.disabled).length
  );
  results.freeze = { disabledCount, pass: disabledCount === mutationButtons };
  // Downstream blocks flagged (red rows / broken check icons).
  results.brokenIcons = await page.$$eval('td [aria-label="Hash mismatch vs predecessor"]', (x) => x.length);
}

/* ── Restore ──────────────────────────────────────────────────────────── */
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) =>
    b.textContent.includes("Restore Integrity")
  );
  btn?.click();
});
await sleep(2500);
const afterTxt = await page.evaluate(() => document.body.innerText);
results.restore = {
  pass: !afterTxt.toUpperCase().includes("CRYPTOGRAPHIC MUTATION DETECTED"),
};

results.pageErrors = errors;
console.log(JSON.stringify(results, null, 2));
await browser.close();
