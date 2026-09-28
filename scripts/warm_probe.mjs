import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
page.on("console", (m) => console.log(`[console.${m.type()}]`, m.text().slice(0, 140)));
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 140)));
const calls = [];
page.on("response", (r) => { const u = r.url(); if (u.includes(":8000")) calls.push(`${r.status()} ${u.slice(21)}`); });
await page.goto("http://127.0.0.1:3000/works", { waitUntil: "networkidle2", timeout: 90000 });
await new Promise((r) => setTimeout(r, 10000));
const rows = await page.evaluate(() => ({
  worksRows: document.querySelectorAll("table")[0]?.querySelectorAll("tbody tr").length ?? 0,
  hasRealId: document.body.innerText.includes("WS/MP"),
  hasError: /failed|unreachable|error/i.test(document.body.innerText.slice(2000, 4000)),
}));
console.log("API calls after 10s:", calls.length ? calls : "NONE");
console.log("rows:", rows.worksRows, "| real WS ids visible:", rows.hasRealId, "| error text:", rows.hasError);
await browser.close();
