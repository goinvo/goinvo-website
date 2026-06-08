// Regression gate: renders every client-side chart page and asserts each chart's
// labels sit on their data marks (catches the killer-truths "double-transform" class
// of bug that structural/DOM checks miss). Pie/comparison/static charts report N/A.
//
// Usage: node scripts/check-chart-pages.mjs [baseUrl]   (default http://localhost:3000)
// Exits 1 if any chart is MISALIGNED.
import { spawnSync } from "node:child_process";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");

// Pages that render a client-side data chart. The detector self-reports N/A for
// non-1:1-bar charts (coronavirus comparison + table, determinants donut, the
// open-source static SVG), so they're safe to include — only real drift fails.
const CHART_PAGES = [
  "/vision/killer-truths",
  "/vision/coronavirus",
  "/vision/determinants-of-health",
  "/open-source-health-design",
];

let failures = 0;
const rows = [];
for (const path of CHART_PAGES) {
  const r = spawnSync("node", ["scripts/chart-label-alignment.mjs", base + path], { encoding: "utf8" });
  let out = {};
  try {
    out = JSON.parse((r.stdout || "").slice((r.stdout || "").indexOf("{")));
  } catch {
    out = { status: "ERROR", error: (r.stderr || "").slice(0, 200) };
  }
  const status = out.status || (out.ok ? "ALIGNED" : "MISALIGNED");
  rows.push({ path, status, bars: out.bars, labels: out.names });
  if (Array.isArray(out.misaligned) && out.misaligned.length) {
    failures++;
    console.log(`\nMISALIGNED  ${path}`);
    out.misaligned.forEach((m) => console.log("    - " + m));
  } else if (out.status === "ERROR") {
    failures++;
    console.log(`\nERROR       ${path}: ${out.error}`);
  }
}

console.log("\n=== chart-page alignment ===");
for (const row of rows) {
  console.log(`  ${String(row.status).padEnd(12)} ${row.path}  (bars=${row.bars ?? "?"}, labels=${row.labels ?? "?"})`);
}
console.log(failures ? `\n${failures} chart(s) MISALIGNED` : "\nAll chart pages OK (aligned or N/A).");
process.exit(failures ? 1 : 0);
