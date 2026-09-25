import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

/**
 * Builds the Marqueta data-design case study: one self-contained HTML page
 * that mounts the PRODUCTION chart components (src/components/marketing-viz)
 * on an invented week. Every person, organisation and number in
 * fixtures.ts is made up — never point this at real data; the page is meant
 * to be shared outside the studio.
 *
 *   node scripts/marketing-viz-showcase/build.mjs
 *   → test-results/marketing-viz-showcase/marqueta.html
 *
 * React is bundled into the page rather than loaded from a CDN so the page
 * runs the repo's own React and can be checked offline.
 */
const HERE = path.dirname(new URL(import.meta.url).pathname)
const REPO = process.cwd()
const OUT = path.join(REPO, 'test-results', 'marketing-viz-showcase')
const require = createRequire(path.join(REPO, 'package.json'))
const esbuild = require('esbuild')

mkdirSync(OUT, { recursive: true })

// ── numbers, from the same fixtures the charts render ───────────────────────
await esbuild.build({ entryPoints: [path.join(HERE, 'stats.ts')], bundle: true, platform: 'node', outfile: path.join(OUT, 'stats.cjs'), alias: { '@': path.join(REPO, 'src') }, logLevel: 'warning' })
const S = JSON.parse(execFileSync('node', [path.join(OUT, 'stats.cjs')]).toString())

// Records in the invented week, and the ones that reach Monday's message.
const groups = [
  { label: 'contacts', total: S.contacts, kept: S.followUps + 3, why: `${S.followUps} owed a follow-up, 3 on the call sheet` },
  { label: 'logged calls and emails', total: S.touches, kept: S.last.touches, why: `last week’s ${S.last.touches}, summed into one line` },
  { label: 'research findings', total: S.research[1], kept: S.research[3], why: `${S.research[3]} verified against their source` },
  { label: 'board tasks', total: 31, kept: 7, why: '5 need an owner, 2 need a decision' },
  { label: 'Slack messages read', total: 164, kept: 4, why: '4 sounded like proposals' },
]
const records = groups.reduce((n, g) => n + g.total, 0)
const kept = groups.reduce((n, g) => n + g.kept, 0)

// ── hero: a unit chart, one dot per record ───────────────────────────────────
function heroSvg() {
  const cols = 30, pitch = 10, r = 3.1, left = 0, labelH = 30, gapAfter = 14
  let y = 0
  const parts = []
  for (const g of groups) {
    parts.push(`<text x="${left}" y="${y + 13}" font-family="var(--mono)" font-size="12" fill="currentColor"><tspan font-weight="500">${g.total}</tspan> ${g.label}</text>`)
    parts.push(`<text x="${left + cols * pitch}" y="${y + 13}" font-family="var(--mono)" font-size="11" text-anchor="end" fill="var(--accent-text)">${g.kept} kept</text>`)
    y += labelH - 10
    const rows = Math.ceil(g.total / cols)
    for (let i = 0; i < g.total; i++) {
      const cx = left + (i % cols) * pitch + r
      const cy = y + Math.floor(i / cols) * pitch + r
      const on = i < g.kept
      parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="${on ? 'var(--accent)' : 'var(--rule)'}"/>`)
    }
    y += rows * pitch + gapAfter
  }
  const gridBottom = y - gapAfter
  // the message card
  const cx0 = 360, cw = 200, cy0 = Math.max(20, gridBottom / 2 - 90), ch = 180
  const line = (yy, w, strong) => `<rect x="${cx0 + 16}" y="${yy}" width="${w}" height="${strong ? 8 : 6}" rx="3" fill="${strong ? 'currentColor' : 'var(--rule)'}" opacity="${strong ? 0.85 : 1}"/>`
  parts.push(`<g>`)
  parts.push(`<rect x="${cx0}" y="${cy0}" width="${cw}" height="${ch}" rx="10" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"/>`)
  parts.push(`<rect x="${cx0 + 16}" y="${cy0 + 16}" width="22" height="22" rx="5" fill="var(--accent)"/>`)
  parts.push(`<text x="${cx0 + 46}" y="${cy0 + 32}" font-family="var(--display)" font-size="15" font-weight="700" fill="currentColor">Monday plan</text>`)
  parts.push(line(cy0 + 52, 150, false))
  parts.push(`<rect x="${cx0 + 16}" y="${cy0 + 68}" width="76" height="34" rx="4" fill="var(--accent-wash)"/><rect x="${cx0 + 100}" y="${cy0 + 68}" width="84" height="34" rx="4" fill="var(--accent-wash)"/>`)
  parts.push(`<text x="${cx0 + 24}" y="${cy0 + 91}" font-family="var(--display)" font-size="16" font-weight="700" fill="currentColor">${S.last.touches}</text><text x="${cx0 + 108}" y="${cy0 + 91}" font-family="var(--display)" font-size="16" font-weight="700" fill="currentColor">${S.followUps}</text>`)
  parts.push(`<text x="${cx0 + 46}" y="${cy0 + 91}" font-family="var(--mono)" font-size="9" fill="currentColor">touches</text><text x="${cx0 + 132}" y="${cy0 + 91}" font-family="var(--mono)" font-size="9" fill="currentColor">owed</text>`)
  parts.push(line(cy0 + 114, 120, true))
  parts.push(`<rect x="${cx0 + 16}" y="${cy0 + 130}" width="70" height="20" rx="4" fill="#007a5a"/><text x="${cx0 + 51}" y="${cy0 + 144}" font-size="10" font-weight="700" text-anchor="middle" fill="#ffffff" font-family="var(--body)">I’ll take it</text>`)
  parts.push(`<rect x="${cx0 + 92}" y="${cy0 + 130}" width="52" height="20" rx="4" fill="none" stroke="var(--rule)"/><text x="${cx0 + 118}" y="${cy0 + 144}" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor" font-family="var(--body)">Not me</text>`)
  parts.push(line(cy0 + 160, 90, false))
  parts.push(`</g>`)
  // the convergence arrow
  const ax = cols * pitch + 14, ay = cy0 + ch / 2
  parts.push(`<path d="M${ax},${ay} H${cx0 - 10}" stroke="var(--accent)" stroke-width="2" fill="none"/>`)
  parts.push(`<polygon points="${cx0 - 2},${ay} ${cx0 - 12},${ay - 5} ${cx0 - 12},${ay + 5}" fill="var(--accent)"/>`)
  parts.push(`<text x="${(ax + cx0) / 2 - 4}" y="${ay - 10}" font-family="var(--mono)" font-size="11" text-anchor="middle" fill="currentColor">${kept} of ${records}</text>`)
  const W = cx0 + cw + 2, H = Math.max(gridBottom, cy0 + ch) + 4
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${records} records in an invented week, shown as one dot each; ${kept} of them reach the Monday plan message." style="color: var(--ink)">${parts.join('')}</svg>`
}

// ── the pipeline: records → checks → decisions → delivery ───────────────────
function pipelineSvg() {
  const cols = [
    { n: '1', title: 'Records', boxes: [[`Contacts + call log`, `${S.contacts} people · ${S.touches} touches`], ['Org research', `${S.research[1]} orgs · cited quotes`], ['Task board', '31 tasks · minutes each'], ['Runway date', 'certain to 8 Feb'], ['Slack channels', '164 messages read']] },
    { n: '2', title: 'Checks', boxes: [['Quote is on the page', `${S.research[1]} → ${S.research[2]} → ${S.research[3]} verified`], ['One record per contact', 'drafts never double-count'], ['Newer fact wins', 'date vs hand-set posture'], ['Is it a proposal?', 'word-boundary markers']] },
    { n: '3', title: 'Decisions', boxes: [['Fit the week to 4h', 'follow-ups held first'], ['Posture from the date', 'Rebuild until 8 Nov'], ['Name the biggest drop', 'replied → met'], ['Who to ask', 'never the same person twice']] },
    { n: '4', title: 'Delivery', boxes: [['Monday plan', 'Slack · 9am'], ['Thursday check-in', 'Slack · one list each'], ['Call prep', 'on request, in thread'], ['This week', 'Sanity Studio']] },
  ]
  const W = 1040, colW = 218, gap = (W - colW * 4) / 3, boxH = 50, boxGap = 12, top = 44
  const parts = []
  const heights = cols.map((c) => c.boxes.length * (boxH + boxGap) - boxGap)
  const H = top + Math.max(...heights) + 8
  const arrows = ['counted', 'passed', 'posted']
  cols.forEach((col, ci) => {
    const x = ci * (colW + gap)
    parts.push(`<text x="${x}" y="16" font-family="var(--mono)" font-size="12" fill="var(--muted)">${col.n}</text>`)
    parts.push(`<text x="${x + 18}" y="16" font-family="var(--display)" font-size="16" font-weight="600" fill="currentColor">${col.title}</text>`)
    const colTop = top + (Math.max(...heights) - heights[ci]) / 2
    col.boxes.forEach(([t, d], bi) => {
      const y = colTop + bi * (boxH + boxGap)
      const emph = ci === 3 && bi === 0
      parts.push(`<rect x="${x}" y="${y}" width="${colW}" height="${boxH}" rx="8" fill="${emph ? 'var(--accent-wash)' : 'var(--surface)'}" stroke="${emph ? 'var(--accent)' : 'var(--rule)'}" stroke-width="${emph ? 2 : 1}"/>`)
      parts.push(`<text x="${x + 12}" y="${y + 21}" font-family="var(--body)" font-size="14" font-weight="700" fill="currentColor">${t}</text>`)
      parts.push(`<text x="${x + 12}" y="${y + 39}" font-family="var(--mono)" font-size="11" fill="var(--secondary)">${d}</text>`)
    })
    if (ci < 3) {
      const ax = x + colW + 8, bx = x + colW + gap - 8, ay = top + Math.max(...heights) / 2
      parts.push(`<path d="M${ax},${ay} H${bx - 8}" stroke="var(--accent)" stroke-width="2"/>`)
      parts.push(`<polygon points="${bx},${ay} ${bx - 9},${ay - 5} ${bx - 9},${ay + 5}" fill="var(--accent)"/>`)
      parts.push(`<text x="${(ax + bx) / 2}" y="${ay - 9}" font-family="var(--mono)" font-size="10" text-anchor="middle" fill="var(--secondary)">${arrows[ci]}</text>`)
    }
  })
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Four stages: records are counted, only what passes the checks becomes a decision, and decisions are posted to Slack and the Studio." style="color: var(--ink)">${parts.join('')}</svg>`
}

// ── swatches from the real token module ─────────────────────────────────────
await esbuild.build({ entryPoints: [path.join(REPO, 'src/lib/marketing/viz/tokens.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(OUT, 'tokens.cjs'), logLevel: 'warning' })
const { vizTokens } = require(path.join(OUT, 'tokens.cjs'))
const light = vizTokens('light'), dark = vizTokens('dark')
const sw = (list, cls = '') => list.map((hex) => `<span class="swatch ${cls}" style="background:${hex}" title="${hex}"></span>`).join('')
const SW = {
  cat: sw(light.categorical) + '<span style="width:12px"></span>' + sw(dark.categorical),
  ord: sw(light.ordinal, 'wide') + '<span style="width:12px"></span>' + sw(dark.ordinal, 'wide'),
  seq: sw(light.sequential, 'wide'),
  status: sw(Object.values(light.status)),
}

// ── the page's own bundle: the production components on invented data ──────
const bundle = await esbuild.build({
  entryPoints: [path.join(HERE, 'entry.tsx')],
  bundle: true, write: false, minify: true, format: 'iife', target: 'es2020',
  jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
  alias: { '@': path.join(REPO, 'src') }, tsconfig: path.join(REPO, 'tsconfig.json'), logLevel: 'warning',
  nodePaths: [path.join(REPO, 'node_modules')],
})
const js = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')

const delta = S.last.touches - S.before
const moved = [S.last.replies && `<b>${S.last.replies}</b> ${S.last.replies === 1 ? 'reply' : 'replies'}`, S.last.meetings && `<b>${S.last.meetings}</b> ${S.last.meetings === 1 ? 'meeting' : 'meetings'}`, S.last.opp && `<b>${S.last.opp}</b> scoped`, S.last.won && `<b>${S.last.won}</b> won`].filter(Boolean).join(' · ') || '<b>0</b> conversations moved forward'
const N = {
  records, kept, done: 4, lastTouches: S.last.touches, lastPeople: S.last.people,
  trend: delta === 0 ? 'same as the week before' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)} on the week before`,
  moved, followUps: S.followUps, overdue: S.followUpsOverdue,
}
let html = readFileSync(path.join(HERE, 'template.html'), 'utf8')
html = html.replace('{{HERO_SVG}}', heroSvg()).replace('{{PIPELINE_SVG}}', pipelineSvg())
html = html.replace(/\{\{N\.(\w+)\}\}/g, (_, k) => String(N[k]))
html = html.replace(/\{\{SW\.(\w+)\}\}/g, (_, k) => SW[k])
html = html.replace('{{BUNDLE}}', () => js)
writeFileSync(path.join(OUT, 'marqueta.html'), html)
console.log('wrote', (html.length / 1024).toFixed(0), 'KB;', { records, kept })
