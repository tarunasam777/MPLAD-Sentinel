/* Browser-level verification of the universal search: header dropdown live
 * results, deep links, keyboard nav, and the /search page end-to-end. */
import puppeteer from "puppeteer-core";

const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:3000";
const results = [];
const check = (name, ok, extra = "") =>
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? ` — ${extra}` : ""}`);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

try {
  // ── 1. Header search: type, dropdown appears with grouped results ──
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('input[aria-label*="universal" i], input[type="search"]', { timeout: 15000 });
  // The universal search input is the one with the combobox role.
  const input = await page.$('input[role="combobox"]');
  check("header search input present", !!input);
  if (!input) throw new Error("no search input");

  await input.type("Kishan", { delay: 40 });
  await page.waitForSelector("#universal-search-dropdown", { timeout: 8000 });
  // Wait for actual results (debounce 250ms + fetch), not just the open box.
  await page.waitForFunction(
    () => document.querySelector("#universal-search-dropdown")?.innerText.includes("→") &&
      (document.querySelectorAll("#universal-search-dropdown [data-search-row]").length > 0 ||
       document.querySelector("#universal-search-dropdown")?.innerText.includes("No matches")),
    { timeout: 10000 }
  );
  await new Promise((r) => setTimeout(r, 300));

  const dropdownText = await page.$eval("#universal-search-dropdown", (el) => el.innerText);
  check("dropdown shows MP group", /MPs?/i.test(dropdownText), dropdownText.slice(0, 80).replace(/\n/g, " | "));

  // ── 2. Enter → /search results page ──
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => location.pathname === "/search", { timeout: 10000 });
  check("Enter navigates to /search", true);
  await page.waitForFunction(
    () => document.body.innerText.includes("result") && !document.body.innerText.includes("Searching…"),
    { timeout: 15000 }
  );
  const searchBody = await page.evaluate(() => document.body.innerText);
  check("/search shows MP hit", /Kishan/i.test(searchBody));
  check("/search shows deep-link groups", /Works|MPs|Demo cases|Ledger/i.test(searchBody));

  // ── 3. Direct deep link: a REAL work id from the live backend ──
  const realId = await page.evaluate(async () => {
    const r = await fetch("http://127.0.0.1:8000/api/v1/works?page=1&pageSize=1");
    const j = await r.json();
    return j.works?.[0]?.id ?? null;
  });
  check("fetched a real work id for the test", !!realId, realId ?? "none");
  const idToken = realId ? realId.split("/").pop() : "205446";
  await page.goto(`${BASE}/search?q=${encodeURIComponent(idToken)}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(
    () => !document.body.innerText.includes("Searching…"),
    { timeout: 15000 }
  );
  const body2 = await page.evaluate(() => document.body.innerText);
  check("work-id search shows Works group", /works/i.test(body2));
  // Click the first Works result → should land on /works?q=…
  const clicked = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href^="/works?q="]')];
    if (links.length === 0) return null;
    links[0].click();
    return links[0].getAttribute("href");
  });
  check("works hit deep link exists", !!clicked, clicked ?? "none");
  if (clicked) {
    await page.waitForFunction(() => location.pathname === "/works", { timeout: 10000 });
    // Wait out the "Loading register…" row — data must actually be present.
    await page.waitForFunction(
      (tok) =>
        !document.body.innerText.includes("Loading register") &&
        new RegExp(tok).test(document.body.innerText),
      { timeout: 20000 },
      idToken
    );
    const rows = await page.evaluate(() => document.querySelectorAll("table tbody tr").length);
    const bodyText = await page.evaluate(() => document.body.innerText);
    check("works page filtered by deep link", rows > 0 && new RegExp(idToken).test(bodyText), `${rows} rows`);
  }

  // ── 4. MP deep link → /dashboard/mp?mp=… ──
  await page.goto(`${BASE}/search?q=Owaisi`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => !document.body.innerText.includes("Searching…"), { timeout: 15000 });
  const mpLink = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href^="/dashboard/mp?mp="]')];
    return a.length ? a[0].getAttribute("href") : null;
  });
  check("MP hit deep link exists", !!mpLink, mpLink ?? "none");
  if (mpLink) {
    await page.goto(`${BASE}${mpLink}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(
      () => document.body.innerText.length > 500,
      { timeout: 15000 }
    );
    const mpBody = await page.evaluate(() => document.body.innerText);
    check("MP dashboard renders from deep link", /Owaisi/i.test(mpBody));
  }

  // ── 5. Ledger deep link highlights block ──
  await page.goto(`${BASE}/search?q=genesis`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => !document.body.innerText.includes("Searching…"), { timeout: 15000 });
  const ledLink = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href^="/ledger?q="]')];
    return a.length ? a[0].getAttribute("href") : null;
  });
  check("ledger hit deep link exists", !!ledLink, ledLink ?? "none");

  // ── 6. No-results case ──
  await page.goto(`${BASE}/search?q=zzqqxx_never_9137`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => !document.body.innerText.includes("Searching…"), { timeout: 15000 });
  const none = await page.evaluate(() => document.body.innerText);
  check("no-results message shows", /No matches/i.test(none));

  check("zero page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
} finally {
  await browser.close();
}
console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL"));
process.exit(failed.length ? 1 : 0);
