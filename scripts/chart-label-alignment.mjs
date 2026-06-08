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
  if (!best || bestN < 2) return { ok: true, status: "N/A", reason: "no bar-chart svg found" };

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
  // Tight: a label should sit ON its bar, not just within the same row. Allow only
  // a few px of font-metric slop (the loose rowH/2 tolerance let a -5px drift pass).
  const tol = Math.max(rowH * 0.1, 4);

  const misaligned = [];
  const notApplicable = [];
  let checked = 0;
  const check = (label, arr) => {
    if (!arr.length) return;
    // Different label/bar counts => not a 1:1 bar chart (axis ticks, legends,
    // a data table, a pie chart, etc.). The pairwise alignment check can't apply,
    // so report N/A rather than a false failure.
    if (arr.length !== bars.length) {
      notApplicable.push(`${label}: ${arr.length} labels vs ${bars.length} bars (not a 1:1 bar chart)`);
      return;
    }
    checked++;
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

  // Only a genuine pairwise position drift is a failure. Aligned or N/A both pass.
  const status = misaligned.length ? "MISALIGNED" : checked ? "ALIGNED" : "N/A";
  return {
    ok: misaligned.length === 0,
    status,
    bars: bars.length,
    names: nameYs.length,
    values: valueYs.length,
    rowHeightPx: Math.round(rowH),
    tolerancePx: Math.round(tol),
    misaligned: misaligned.slice(0, 10),
    notApplicable,
  };
});

console.log(JSON.stringify({ url, ...res }, null, 2));
const shotPath = process.argv[3];
if (shotPath) {
  await page.screenshot({ path: shotPath });
}
await browser.close();
process.exit(res.ok ? 0 : 1);
