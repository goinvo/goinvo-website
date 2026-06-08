// Detects SVG bar-chart labels that don't vertically align with their bars.
// Catches "double-transform" / off-by-row label bugs that DOM-count checks miss
// (the DOM can have the right number of elements but render them misaligned).
//
// Usage: node scripts/chart-label-alignment.mjs <url> [labelSelector]
// Exits 1 if any label is misaligned with its bar (CI-style gate).
import puppeteer from "puppeteer";

const url = process.argv[2];
if (!url) {
  console.error("usage: node scripts/chart-label-alignment.mjs <url>");
  process.exit(2);
}

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1300, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
await new Promise((r) => setTimeout(r, 3000));

const res = await page.evaluate(() => {
  // The chart = the SVG with the most <rect> elements.
  let best = null;
  let bestN = -1;
  document.querySelectorAll("svg").forEach((s) => {
    const n = s.querySelectorAll("rect").length;
    if (n > bestN) {
      bestN = n;
      best = s;
    }
  });
  if (!best || bestN < 2) return { ok: false, reason: "no bar-chart svg found" };

  const centerY = (el) => {
    const r = el.getBoundingClientRect();
    return r.top + r.height / 2;
  };
  const bars = [...best.querySelectorAll("rect")].map(centerY).sort((a, b) => a - b);
  const names = [...best.querySelectorAll(".name, text")].filter((_, i, arr) => arr.length >= bars.length);
  // Prefer explicit label classes; fall back to all <text>.
  const nameEls = best.querySelectorAll(".name").length
    ? [...best.querySelectorAll(".name")]
    : [...best.querySelectorAll("text")];
  const valueEls = best.querySelectorAll(".value").length ? [...best.querySelectorAll(".value")] : [];
  const nameYs = nameEls.map(centerY).sort((a, b) => a - b);
  const valueYs = valueEls.map(centerY).sort((a, b) => a - b);

  const rowH = bars.length > 1 ? (bars[bars.length - 1] - bars[0]) / (bars.length - 1) : 40;
  const tol = Math.max(rowH / 2, 6);

  const misaligned = [];
  const check = (label, arr) => {
    if (!arr.length) return;
    if (arr.length !== bars.length) {
      misaligned.push(`${label}: ${arr.length} labels vs ${bars.length} bars`);
      return;
    }
    for (let i = 0; i < bars.length; i++) {
      const d = Math.abs(arr[i] - bars[i]);
      if (d > tol) {
        misaligned.push(
          `${label}[${i}] off by ${Math.round(d)}px (label y=${Math.round(arr[i])}, bar y=${Math.round(bars[i])})`,
        );
      }
    }
  };
  check("name", nameYs);
  check("value", valueYs);

  return {
    ok: misaligned.length === 0,
    bars: bars.length,
    names: nameYs.length,
    values: valueYs.length,
    rowHeightPx: Math.round(rowH),
    tolerancePx: Math.round(tol),
    misaligned: misaligned.slice(0, 10),
  };
});

console.log(JSON.stringify({ url, ...res }, null, 2));
await browser.close();
process.exit(res.ok ? 0 : 1);
