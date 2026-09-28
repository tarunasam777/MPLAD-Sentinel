/* Deep probe: actual store mode + works-page network + row rendering. */
import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
const apiCalls = [];
page.on("response", (r) => {
  const u = r.url();
  if (u.includes("127.0.0.1:8000")) {
    apiCalls.push(`${r.status()} ${u.replace("http://127.0.0.1:8000", "")}`);
  }
});
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("hmr") && !m.text().includes("WebSocket")) {
    console.log("CONSOLE-ERR:", m.text().slice(0, 150));
  }
});

await page.goto("http://127.0.0.1:3000/works", { waitUntil: "networkidle2", timeout: 60000 });
await new Promise((r) => setTimeout(r, 6000));

const probe = await page.evaluate(() => {
  const t = document.body.innerText;
  const tables = document.querySelectorAll("table");
  const mainRows = tables[0] ? tables[0].querySelectorAll("tbody tr").length : 0;
  const emptyState = t.match(/No works|No results|Loading/i);
  return {
    modeBanner: t.includes("LIVE PIPELINE") ? "LIVE" : t.includes("DEMO MODE") && t.includes("Retry") ? "DEMO+retry" : "unclear",
    mainRows,
    tableCount: tables.length,
    emptyState: emptyState ? emptyState[0] : null,
    sample: t.slice(0, 1200),
  };
});

console.log("modeBanner:", probe.modeBanner);
console.log("mainRows rendered:", probe.mainRows, "| tables:", probe.tableCount, "| emptyState:", probe.emptyState);
console.log("API calls made by the page:");
apiCalls.forEach((c) => console.log("  ", c));
console.log("sample text:", probe.sample.replace(/\n/g, " ⏎ ").slice(0, 500));

await browser.close();
