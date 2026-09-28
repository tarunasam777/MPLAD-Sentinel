import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
page.on("requestfailed", (r) => console.log("REQ-FAILED:", r.failure()?.errorText, r.url().slice(0, 100)));
page.on("response", (r) => { const u = r.url(); if (/8000|health|works/.test(u)) console.log("RESP:", r.status(), u.slice(0, 110)); });
await page.goto("http://127.0.0.1:3000/works", { waitUntil: "networkidle2", timeout: 60000 });
await new Promise((r) => setTimeout(r, 4000));
const state = await page.evaluate(async () => {
  const out = { scripts: document.querySelectorAll("script[src]").length };
  out.nextData = typeof window.__NEXT_DATA__ !== "undefined" ? "yes" : "no";
  try {
    const r = await fetch("http://127.0.0.1:8000/health");
    out.fetch127 = r.status + " " + JSON.stringify(await r.json());
  } catch (e) { out.fetch127 = "FAILED: " + String(e).slice(0, 80); }
  try {
    const r2 = await fetch("http://localhost:8000/health");
    out.fetchLocalhost = r2.status;
  } catch (e) { out.fetchLocalhost = "FAILED: " + String(e).slice(0, 80); }
  return out;
});
console.log("page state:", JSON.stringify(state, null, 2));
await browser.close();
