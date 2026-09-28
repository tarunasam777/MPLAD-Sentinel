import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

for (const origin of ["http://127.0.0.1:3000", "http://localhost:3000"]) {
  const page = await browser.newPage();
  const bad = [];
  let apiCalls = 0;
  let jsErrors = 0;
  page.on("response", (r) => {
    const u = r.url();
    if (r.status() >= 400 && !u.includes("hmr")) bad.push(`${r.status()} ${u.slice(0, 100)}`);
    if (u.includes(":8000")) apiCalls++;
  });
  page.on("pageerror", () => jsErrors++);
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("hmr") && !m.text().includes("WebSocket")) {
      bad.push("console: " + m.text().slice(0, 100));
    }
  });
  await page.goto(origin + "/works", { waitUntil: "networkidle2", timeout: 90000 });
  await new Promise((r) => setTimeout(r, 8000));
  const state = await page.evaluate(() => ({
    rows: document.querySelectorAll("table")[0]?.querySelectorAll("tbody tr").length ?? 0,
    realId: document.body.innerText.includes("WS/MP"),
  }));
  console.log(
    `${origin} → rows:${state.rows} realIds:${state.realId} apiCalls:${apiCalls} jsErrors:${jsErrors} bad:${bad.length ? bad.join(" | ") : "none"}`
  );
  await page.close();
}
await browser.close();
