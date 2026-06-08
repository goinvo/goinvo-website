// First-pass visual/structural audit of a live page: HTTP status, console/page
// errors, horizontal overflow, broken images, empty embeds, and a viewport
// screenshot for a human/agent to eyeball. Complements check-chart-pages.mjs.
//
// Usage: node scripts/page-visual-audit.mjs <url> <screenshotPath>
import puppeteer from "puppeteer";

const url = process.argv[2];
const shot = process.argv[3] || "c:/tmp/audit.png";

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 1 });

const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 220));
});
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + String(e).slice(0, 220)));

let httpStatus = 0;
try {
  const resp = await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
  httpStatus = resp ? resp.status() : 0;
} catch (e) {
  console.log(JSON.stringify({ url, error: "navigation failed: " + String(e).slice(0, 200) }, null, 2));
  await browser.close();
  process.exit(0);
}
await new Promise((r) => setTimeout(r, 3000));

const checks = await page.evaluate(() => {
  const de = document.documentElement;
  const imgs = [...document.images];
  return {
    title: document.title,
    horizontalOverflowPx: de.scrollWidth - de.clientWidth,
    pageHeight: de.scrollHeight,
    imgTotal: imgs.length,
    brokenImgs: imgs
      .filter((i) => i.complete && i.naturalWidth === 0)
      .map((i) => (i.currentSrc || i.getAttribute("src") || "").slice(-80))
      .slice(0, 12),
    emptyObjects: [...document.querySelectorAll("object")].filter((o) => !o.offsetHeight).length,
    h1: (document.querySelector("h1")?.textContent || "").trim().slice(0, 80),
  };
});

await page.screenshot({ path: shot, fullPage: false });
console.log(JSON.stringify({ url, httpStatus, ...checks, consoleErrors: consoleErrors.slice(0, 8), screenshot: shot }, null, 2));
await browser.close();
