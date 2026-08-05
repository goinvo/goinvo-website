/**
 * The outreach brief card TEMPLATE — this file is the design surface.
 * Everything visual lives here (Shirley iterates on this file); what content is
 * ALLOWED on the card is owned by briefCard.ts and is not a design decision.
 *
 * Output: a self-contained HTML document sized for a 1000px-wide sheet,
 * rendered to PNG/PDF by scripts/generate-brief-card.ts (Puppeteer).
 */

import { BRIEF_CARD_FAILURE_MODES, type BriefCardData } from './briefCard'

const INK = '#1d1b1a'
const PAPER = '#fdfcfa'
const ACCENT = '#d94d2f'
const MUTED = '#6f6a64'
const LINE = '#e7e2db'

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

/** Radar geometry: 8 axes clockwise from 12 o'clock; returns SVG markup. */
function radarSvg(elevatedKeys: readonly string[]): string {
  // Wider than tall: start/end-anchored side labels need horizontal room, or
  // they clip at the viewBox edge.
  const width = 440
  const height = 348
  const cx = width / 2
  const cy = height / 2
  const rMax = cy - 54
  const angles = BRIEF_CARD_FAILURE_MODES.map((_, index) => ((index * 45 - 90) * Math.PI) / 180)
  const point = (radius: number, angle: number) =>
    `${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`

  const ring = (radius: number) => angles.map((a) => point(radius, a)).join(' ')
  const spokes = angles
    .map((a) => `<line x1="${cx}" y1="${cy}" x2="${point(rMax, a).replace(',', '" y2="')}" />`)
    .join('')

  const values = BRIEF_CARD_FAILURE_MODES.map((mode) =>
    elevatedKeys.includes(mode.key) ? rMax * 0.92 : rMax * 0.42,
  )
  const dataPolygon = angles.map((a, index) => point(values[index], a)).join(' ')
  const dots = angles
    .map((a, index) =>
      elevatedKeys.includes(BRIEF_CARD_FAILURE_MODES[index].key)
        ? `<circle cx="${point(values[index], a).replace(',', '" cy="')}" r="5" fill="${ACCENT}" />`
        : '',
    )
    .join('')

  const labels = angles
    .map((a, index) => {
      const mode = BRIEF_CARD_FAILURE_MODES[index]
      const elevated = elevatedKeys.includes(mode.key)
      const lx = cx + (rMax + 16) * Math.cos(a)
      const ly = cy + (rMax + 16) * Math.sin(a)
      const anchor = Math.cos(a) > 0.35 ? 'start' : Math.cos(a) < -0.35 ? 'end' : 'middle'
      const dy = Math.sin(a) > 0.35 ? 10 : Math.sin(a) < -0.35 ? -4 : 4
      const style = elevated ? ` fill="${ACCENT}" font-weight="700"` : ` fill="${MUTED}"`
      return `<text x="${lx.toFixed(1)}" y="${(ly + dy).toFixed(1)}" text-anchor="${anchor}"${style}>${escapeHtml(mode.label)}</text>`
    })
    .join('')

  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Failure-mode radar">
    <g stroke="${LINE}" fill="none">
      <polygon points="${ring(rMax)}" />
      <polygon points="${ring(rMax * 0.66)}" />
      <polygon points="${ring(rMax * 0.33)}" />
      ${spokes}
    </g>
    <polygon points="${dataPolygon}" fill="rgba(217,77,47,0.14)" stroke="${ACCENT}" stroke-width="2" />
    ${dots}
    <g font-size="11" font-family="'Helvetica Neue', Arial, sans-serif">${labels}</g>
  </svg>`
}

export function renderBriefCardHtml(data: BriefCardData): string {
  const receipts = data.receipts
    .map(
      (receipt) => `
      <div class="receipt">
        <p class="proj">${escapeHtml(receipt.project)}</p>
        ${receipt.metric ? `<p class="metric">${escapeHtml(receipt.metric)}</p>` : ''}
        <p class="detail">${escapeHtml(receipt.detail)}</p>
      </div>`,
    )
    .join('')

  const seeing = data.copy.seeing.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; }
  body { background: ${PAPER}; color: ${INK}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.5; width: 1000px; }
  .card { padding: 52px 56px 40px; }
  .masthead { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid ${INK}; padding-bottom: 14px; }
  .wordmark { font-weight: 800; font-size: 18px; letter-spacing: -0.02em; }
  .wordmark span { color: ${ACCENT}; }
  .kind { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: ${MUTED}; }
  .prepared { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: ${ACCENT}; font-weight: 700; margin: 28px 0 8px; }
  h1 { font-size: 38px; line-height: 1.06; letter-spacing: -0.022em; margin-bottom: 6px; }
  .role { color: ${MUTED}; font-size: 16px; }
  .zones { display: grid; grid-template-columns: 1fr 330px; gap: 40px; padding: 28px 0 8px; align-items: start; }
  .zone-label { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: ${MUTED}; font-weight: 700; margin-bottom: 10px; }
  .seeing p { font-size: 15.5px; margin-bottom: 12px; max-width: 58ch; }
  .source { font-family: ui-monospace, Consolas, monospace; font-size: 11px; color: ${MUTED}; border-left: 2px solid ${LINE}; padding-left: 10px; margin-top: 14px; }
  .premortem { margin-top: 22px; background: rgba(217,77,47,0.09); border-left: 3px solid ${ACCENT}; padding: 14px 16px; }
  .premortem .q { font-weight: 700; font-size: 15.5px; }
  .premortem .a { color: ${MUTED}; font-size: 13.5px; margin-top: 8px; }
  .radar-caption { font-size: 12px; color: ${MUTED}; margin-top: 8px; }
  .receipts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; border-top: 1px solid ${LINE}; padding-top: 20px; margin-top: 12px; }
  .receipt { border: 1px solid ${LINE}; padding: 14px 14px 12px; }
  .receipt .proj { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; margin-bottom: 6px; }
  .receipt .metric { font-size: 21px; font-weight: 800; letter-spacing: -0.02em; color: ${ACCENT}; margin-bottom: 4px; }
  .receipt .detail { font-size: 12.5px; color: ${MUTED}; line-height: 1.45; }
  .offer { margin-top: 24px; border-top: 2px solid ${INK}; padding-top: 16px; display: grid; grid-template-columns: auto 1fr; gap: 6px 18px; align-items: baseline; }
  .offer h2 { font-size: 18px; letter-spacing: -0.01em; }
  .offer p { font-size: 14px; color: ${MUTED}; max-width: 62ch; }
  .foot { margin-top: 28px; padding-top: 12px; border-top: 1px solid ${LINE}; display: flex; justify-content: space-between; gap: 16px; font-size: 11.5px; color: ${MUTED}; }
  .foot .verify { font-weight: 600; }
</style>
</head>
<body>
  <div class="card">
    <div class="masthead">
      <span class="wordmark">GoInvo<span>.</span></span>
      <span class="kind">${escapeHtml(data.preparedLabel)}</span>
    </div>

    <p class="prepared">Prepared for</p>
    <h1>${escapeHtml(data.name)}</h1>
    ${(() => {
      // Skip the org when the role already names it ("… of MITRE's …" · MITRE).
      const role = data.role || ''
      const org = data.organization || ''
      const showOrg = org && !role.toLowerCase().includes(org.toLowerCase())
      const line = [role, showOrg ? org : ''].filter(Boolean).join(' · ')
      return line ? `<p class="role">${escapeHtml(line)}</p>` : ''
    })()}

    <div class="zones">
      <div class="seeing">
        <p class="zone-label">What we're seeing</p>
        ${seeing}
        <p class="source">${escapeHtml(data.copy.sources)}</p>
        <div class="premortem">
          <p class="q">${escapeHtml(data.copy.premortemQuestion)}</p>
          ${data.copy.premortemBet ? `<p class="a">${escapeHtml(data.copy.premortemBet)}</p>` : ''}
        </div>
      </div>
      <div>
        <p class="zone-label">Failure-mode radar</p>
        ${radarSvg(data.copy.radarModes)}
        ${data.copy.radarCaption ? `<p class="radar-caption">${escapeHtml(data.copy.radarCaption)}</p>` : ''}
      </div>
    </div>

    ${receipts ? `<div class="receipts">${receipts}</div>` : ''}

    <div class="offer">
      <h2>${escapeHtml(data.offerTitle)}</h2>
      <p>${escapeHtml(data.offerLine)}</p>
    </div>

    <div class="foot">
      <span class="verify">Everything on this page is public record or our shipped work — verify all of it at goinvo.com/work.</span>
      <span>Prepared by GoInvo · goinvo.com</span>
    </div>
  </div>
</body>
</html>`
}
