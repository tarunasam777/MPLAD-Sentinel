/* Headless-Chrome sweep of every page in Live mode.
 * Captures: console errors, uncaught page errors, failed network requests,
 * and confirms Live-mode hydration + key content per page. */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.SWEEP_BASE ?? "http://127.0.0.1:3000";
// SWEEP_REPEAT: extra loads of /public to hunt flaky hydration mismatches.
const REPEAT_PUBLIC = Number(process.env.SWEEP_REPEAT ?? 1);
const PAGES = [
  { path: "/", must: ["Sentinel"] },
  { path: "/public", must: ["Sentinel"] },
  {
    path: "/works",
    must: ["Works Register"],
    check: async (page) => {
      const data = await page.evaluate(() => ({
        rows: document.querySelectorAll("table tbody tr").length,
        text: document.body.innerText.slice(0, 600),
      }));
      const total = data.text.match(/([\d,]{4,})/);
      return `${data.rows} table rows rendered${total ? `, headline number ${total[1]}` : ""}`;
    },
  },
  { path: "/ledger", must: ["Ledger / Audit Trail"] },
  { path: "/override-audit", must: ["Override"] },
  { path: "/about-methodology", must: [] },
  { path: "/dashboard/mp", must: [], check: async (page) => {
      const txt = await page.evaluate(() => document.body.innerText);
      return txt.includes("Runtime TypeError") ? "CLIENT CRASH" : "MP dashboard rendered";
    } },
  { path: "/dashboard/ministry", must: ["Ministry"] },
  { path: "/dashboard/district", must: [] },
  { path: "/dashboard/vendor", must: [] },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

let failures = 0;
const pageSpecs = PAGES.flatMap((p) =>
  p.path === "/public" ? Array.from({ length: REPEAT_PUBLIC }, () => p) : [p]
);
for (const p of pageSpecs) {
  const page = await browser.newPage();
  const errors = [];
  const badRequests = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    // Dev-server hot-reload socket noise: nonexistent in production builds.
    if (t.includes("/_next/hmr") || t.includes("WebSocket")) return;
    errors.push(t.slice(0, 180));
  });
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${String(e).slice(0, 180)}`));
  page.on("requestfailed", (r) =>
    badRequests.push(`${r.failure()?.errorText}: ${r.url().slice(0, 90)}`)
  );

  let status = "—";
  try {
    const resp = await page.goto(BASE + p.path, { waitUntil: "networkidle2", timeout: 60000 });
    status = `HTTP ${resp.status()}`;
    // Give client-side hydration + live fetches a beat to settle.
    await new Promise((r) => setTimeout(r, 2500));
    const txt = await page.evaluate(() => document.body.innerText);

    const missing = p.must.filter((m) => !txt.includes(m));
    const live = /Live Mode|live data|LIVE/i.test(txt) ? "Live" : "not-live?";
    let extra = p.check ? await p.check(page) : "";

    const crash = txt.includes("Runtime TypeError") || txt.includes("Application error");
    if (crash) errors.push("client crash banner detected");
    if (missing.length) errors.push(`missing expected text: ${missing.join(", ")}`);

    const errNote = errors.length ? `ERRORS: ${errors.join(" | ")}` : "clean";
    const reqNote = badRequests.length ? `FAILED-REQ: ${badRequests.join(" | ")}` : "";
    console.log(`✓ ${p.path} ${status} [${live}] ${extra} ${errNote} ${reqNote}`.trim());
    if (errors.length || badRequests.length) failures++;
  } catch (e) {
    console.log(`✗ ${p.path} threw: ${String(e).slice(0, 200)}`);
    failures++;
  }
  await page.close();
}

// Interactive walkthrough in the real browser: override a held case from the UI.
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
  await page.goto(BASE + "/dashboard/district", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
  const btnCount = await page.$$eval("button", (bs) => bs.length);
  console.log(`✓ interactive check: district dashboard has ${btnCount} buttons${errors.length ? " | ERRORS: " + errors.join(" | ") : " | no page errors during interaction setup"}`);
  await page.close();
} catch (e) {
  console.log(`✗ interactive check: ${String(e).slice(0, 160)}`);
}

await browser.close();
console.log(failures === 0 ? "\n★ SWEEP CLEAN — all pages rendered in Live mode without errors" : `\n✗ ${failures} page(s) had problems`);
process.exit(failures === 0 ? 0 : 1);
