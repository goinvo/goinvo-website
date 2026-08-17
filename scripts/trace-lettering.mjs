#!/usr/bin/env node
// Regenerate src/components/home/letteringData.ts from the hand-lettered
// "everything is designed" source bitmap.
//
//   npm i --no-save potrace
//   node scripts/trace-lettering.mjs --src ~/Desktop/everything_is_designed_sm_960.png
//
// Why this exists rather than a hand-drawn SVG: the source is a photograph of
// brush lettering on black. Tracing keeps the dry-brush breaks and speckle that
// give it its character, and gives us vector edges that stay crisp at hero size
// (the source raster is only 960px wide — far too small to scale up).
//
// The interesting part is the SPLIT. Potrace emits one <path> of ~274 subpaths
// with fill-rule="evenodd", so letter counters are punched by overlap rather
// than by winding direction. To animate the phrase stroke by stroke we need one
// element per brush stroke — but naively splitting on subpath boundaries fills
// in every counter. So we work containment out geometrically (flatten each
// subpath to a polygon, nest them by point-in-polygon) and keep each hole in the
// same <path> as the stroke it belongs to. Verified against the unsplit trace:
// the two render within 0.23% of ink pixels, which is antialiasing alone.

import { rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')

const args = process.argv.slice(2)
const argOf = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}

const SRC = argOf('src', path.join(process.env.HOME ?? '', 'Desktop/everything_is_designed_sm_960.png'))
const OUT = argOf('out', path.join(repoRoot, 'src/components/home/letteringData.ts'))
const TMP = path.join(repoRoot, '.trace-lettering-input.png')

let potrace
try {
  potrace = (await import('potrace')).default
} catch {
  console.error('potrace is not installed. Run:  npm i --no-save potrace')
  process.exit(1)
}

// ---------------------------------------------------------------- 1. prepare
// Crop to the ink, upscale 3x before tracing so potrace follows smooth contours
// instead of the source's pixel stairsteps, and invert (potrace traces dark on
// light, our ink is light on dark).
const INK = { left: 24, top: 30, width: 872, height: 479 } // measured ink bbox + pad
const SCALE = 3

await sharp(SRC)
  .extract(INK)
  .greyscale()
  .resize({ width: INK.width * SCALE, kernel: 'lanczos3' })
  .linear(1.35, -18) // lift contrast so the brush edge is decisive
  .negate({ alpha: false })
  .png()
  .toFile(TMP)

const SRC_W = INK.width * SCALE
const SRC_H = INK.height * SCALE

// ------------------------------------------------------------------ 2. trace
const svg = await new Promise((resolve, reject) =>
  potrace.trace(
    TMP,
    {
      threshold: 128,
      turdSize: 3, // low: the dry-brush speckle IS the texture, keep it
      alphaMax: 1.0,
      optCurve: true,
      optTolerance: 0.2, // higher tolerances barely shrank the output, so stay faithful
      turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
      color: '#ffffff',
      background: 'transparent',
    },
    (err, out) => (err ? reject(err) : resolve(out)),
  ),
)

rmSync(TMP, { force: true })

const d = svg.match(/ d="([^"]+)"/)[1]
const subpaths = d.split(/(?=M )/).map((s) => s.trim()).filter(Boolean)

// ------------------------------------------------------- 3. split by stroke
/** Flatten "M x y C x y, x y, x y ..." into a polygon for containment tests. */
function flatten(sub) {
  const toks = sub.match(/[MC]|-?\d+\.?\d*/g)
  const pts = []
  let i = 0
  let cur = null
  while (i < toks.length) {
    if (toks[i] === 'M') {
      cur = [Number(toks[i + 1]), Number(toks[i + 2])]
      pts.push(cur)
      i += 3
    } else if (toks[i] === 'C') {
      const p0 = cur
      const p1 = [Number(toks[i + 1]), Number(toks[i + 2])]
      const p2 = [Number(toks[i + 3]), Number(toks[i + 4])]
      const p3 = [Number(toks[i + 5]), Number(toks[i + 6])]
      for (const s of [0.25, 0.5, 0.75, 1]) {
        const u = 1 - s
        pts.push([
          u ** 3 * p0[0] + 3 * u * u * s * p1[0] + 3 * u * s * s * p2[0] + s ** 3 * p3[0],
          u ** 3 * p0[1] + 3 * u * u * s * p1[1] + 3 * u * s * s * p2[1] + s ** 3 * p3[1],
        ])
      }
      cur = p3
      i += 7
    } else i++
  }
  return pts
}

function inside([px, py], poly) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

const parts = subpaths.map((sub, i) => {
  const poly = flatten(sub)
  const xs = poly.map((p) => p[0])
  const ys = poly.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return {
    i,
    d: sub,
    poly,
    minX,
    maxX,
    minY,
    maxY,
    w: maxX - minX,
    h: maxY - minY,
    // a point ON this outline; if it falls inside another outline, we're nested
    probe: poly[Math.floor(poly.length / 2)],
  }
})

for (const p of parts) {
  p.containers = parts.filter(
    (q) =>
      q !== p &&
      p.minX >= q.minX && p.maxX <= q.maxX && p.minY >= q.minY && p.maxY <= q.maxY &&
      inside(p.probe, q.poly),
  )
  p.depth = p.containers.length
}

// even nesting depth = ink, odd = a hole in the stroke that encloses it
const strokes = []
const byIndex = new Map()
for (const p of parts.filter((p) => p.depth % 2 === 0)) {
  const g = { ...p, subs: [p.d] }
  strokes.push(g)
  byIndex.set(p.i, g)
}
let attached = 0
let orphaned = 0
for (const p of parts.filter((p) => p.depth % 2 === 1)) {
  const parent = p.containers
    .filter((c) => c.depth % 2 === 0)
    .sort((a, b) => a.w * a.h - b.w * b.h)[0]
  const g = parent && byIndex.get(parent.i)
  if (g) {
    g.subs.push(p.d)
    attached++
  } else orphaned++
}

// ------------------------------------------------- 3b. drop isolated dust
// The source is a photograph, so it carries a few specks of sensor/paper dust
// well outside the lettering. They are indistinguishable from real dry-brush
// flecks by size alone — what gives them away is that they sit ALONE. Drop only
// strokes that are both tiny and far from any neighbour; flecks that belong to
// the lettering always have a stroke close by.
const DUST_AREA = 0.0002 * SRC_W * SRC_H // 0.02% of the canvas
const DUST_GAP = 0.03 * SRC_W // 3% of the width
const gapTo = (a, b) =>
  Math.hypot(
    Math.max(0, Math.max(a.minX - b.maxX, b.minX - a.maxX)),
    Math.max(0, Math.max(a.minY - b.maxY, b.minY - a.maxY)),
  )

const dust = strokes.filter(
  (s) => s.w * s.h < DUST_AREA && strokes.every((o) => o === s || gapTo(s, o) > DUST_GAP),
)
for (const s of dust) strokes.splice(strokes.indexOf(s), 1)

// ------------------------------------------------------- 4. writing order
// The two lines interlock by bounding box (the descenders of EVERYTHING drop
// past the tops of IS DESIGNED) so we can't cut on bbox. Stroke CENTRES do
// separate cleanly, so cut at the widest gap between consecutive centres.
const cy = (g) => (g.minY + g.maxY) / 2
const byCentre = [...strokes].sort((a, b) => cy(a) - cy(b))
let split = SRC_H / 2
let bestGap = 0
for (let i = 1; i < byCentre.length; i++) {
  const gap = cy(byCentre[i]) - cy(byCentre[i - 1])
  const mid = (cy(byCentre[i]) + cy(byCentre[i - 1])) / 2
  if (mid > SRC_H * 0.3 && mid < SRC_H * 0.7 && gap > bestGap) {
    bestGap = gap
    split = mid
  }
}
for (const g of strokes) g.line = cy(g) < split ? 0 : 1
strokes.sort((a, b) => a.line - b.line || a.minX - b.minX)

// --------------------------------------------- 4b. derive the pen strokes
// To make the mark look HANDWRITTEN we need the path the brush travelled, but a
// trace only gives us the outline of where it landed. So skeletonize: rasterize
// each stroke, thin it to a one-pixel ridge (Zhang-Suen), and walk that ridge.
// The result is used as an animated mask over the real letterform, so the brush
// texture is revealed by a pen moving through it rather than faded in.
const VB = 2000 // width of the emitted viewBox; see the emit step for why
const S = VB / SRC_W // source units -> output viewBox units
const SMOOTH_PASSES = Number(argOf('smooth', 2)) // majority passes before thinning
// 1.2 was measured: it cuts 1401 noise sub-paths down to 97 while leaving mask
// coverage unchanged (388 -> 389 uncovered px of 316k), because everything it
// drops already sits under the disc the pen sweeps along the trunk.
const PRUNE_FACTOR = Number(argOf('prune', 1.2))
const RASTER_W = 1200
const RS = RASTER_W / SRC_W // source units -> raster px
const OUT_PER_PX = VB / RASTER_W // raster px -> output viewBox units

/** Render one stroke (with its counters) to a binary grid, cropped to its bbox. */
async function rasterize(group) {
  const pad = 4
  const x0 = Math.max(0, Math.floor(group.minX * RS) - pad)
  const y0 = Math.max(0, Math.floor(group.minY * RS) - pad)
  const w = Math.ceil(group.w * RS) + pad * 2
  const h = Math.ceil(group.h * RS) + pad * 2
  const svgStr =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x0 / RS} ${y0 / RS} ${w / RS} ${h / RS}">` +
    `<path fill="#fff" fill-rule="evenodd" d="${group.subs.join(' ')}"/></svg>`
  const { data } = await sharp(Buffer.from(svgStr)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const grid = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) grid[i] = data[i * 4 + 3] > 127 ? 1 : 0
  return { grid, w, h, x0, y0 }
}

/** Chamfer distance transform — gives the inscribed brush radius. */
function distances(grid, w, h) {
  const D = new Float32Array(w * h).fill(1e9)
  for (let i = 0; i < w * h; i++) if (!grid[i]) D[i] = 0
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : D[y * w + x])
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!grid[i]) continue
      D[i] = Math.min(D[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414)
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x
      if (!grid[i]) continue
      D[i] = Math.min(D[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414)
    }
  return D
}

/**
 * Majority filter. A dry brush leaves ragged edges, and thinning turns every
 * nick in an edge into a skeleton spur — which is why the raw skeleton shatters
 * into thousands of stubs. Rounding the outline off first gives a clean ridge.
 * Only the MASK is smoothed; the letterform the reader sees keeps every nick.
 */
function smooth(src, w, h, passes) {
  let g = Uint8Array.from(src)
  for (let p = 0; p < passes; p++) {
    const out = new Uint8Array(w * h)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let n = 0
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
            n += g[ny * w + nx]
          }
        out[y * w + x] = n >= 5 ? 1 : 0
      }
    g = out
  }
  return g
}

/** Zhang-Suen thinning to a single-pixel-wide skeleton. */
function thin(src, w, h) {
  const g = Uint8Array.from(src)
  const P = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : g[y * w + x])
  let changed = true
  while (changed) {
    changed = false
    for (const step of [0, 1]) {
      const kill = []
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          if (!g[y * w + x]) continue
          const p2 = P(x, y - 1), p3 = P(x + 1, y - 1), p4 = P(x + 1, y), p5 = P(x + 1, y + 1)
          const p6 = P(x, y + 1), p7 = P(x - 1, y + 1), p8 = P(x - 1, y), p9 = P(x - 1, y - 1)
          const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9
          if (B < 2 || B > 6) continue
          const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2]
          let A = 0
          for (let k = 0; k < 8; k++) if (seq[k] === 0 && seq[k + 1] === 1) A++
          if (A !== 1) continue
          if (step === 0) {
            if (p2 * p4 * p6 !== 0 || p4 * p6 * p8 !== 0) continue
          } else {
            if (p2 * p4 * p8 !== 0 || p2 * p6 * p8 !== 0) continue
          }
          kill.push(y * w + x)
        }
      if (kill.length) {
        changed = true
        for (const i of kill) g[i] = 0
      }
    }
  }
  return g
}

const N8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]

/**
 * Turn the skeleton into a pen route.
 *
 * Correctness first: EVERY skeleton edge must end up in some chain. The mask is
 * the union of discs swept along these chains, and by the medial-axis property
 * that union reconstructs the stroke exactly — but only if the whole skeleton is
 * swept. Miss a branch and that ink is invisible on the page forever. So this
 * walks greedily until no unused edge remains, rather than trying to be clever.
 *
 * Naturalness second: at a junction, carry on in the STRAIGHTEST direction. A
 * hand crossing its own stroke keeps going; it doesn't take a right-angle turn.
 * Chains start at endpoints (where a pen starts), left-most first.
 */
function penRoute(sk, w, h) {
  const idx = []
  for (let i = 0; i < w * h; i++) if (sk[i]) idx.push(i)
  if (!idx.length) return []
  const nbrs = (i) => {
    const x = i % w, y = (i / w) | 0
    const out = []
    for (const [dx, dy] of N8) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      if (sk[ny * w + nx]) out.push(ny * w + nx)
    }
    return out
  }
  const deg = new Map(idx.map((i) => [i, nbrs(i).length]))
  const used = new Set()
  const ek = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`)
  const free = (i) => nbrs(i).filter((n) => !used.has(ek(i, n)))

  const walk = (start) => {
    const pts = [start]
    let cur = start
    let dir = null // [dx, dy] the pen is currently travelling
    for (;;) {
      const open = free(cur)
      if (!open.length) break
      let next = open[0]
      if (dir && open.length > 1) {
        // straightest continuation = largest dot product with current heading
        let best = -Infinity
        for (const n of open) {
          const dx = (n % w) - (cur % w)
          const dy = ((n / w) | 0) - ((cur / w) | 0)
          const m = Math.hypot(dx, dy) || 1
          const dot = (dx / m) * dir[0] + (dy / m) * dir[1]
          if (dot > best) { best = dot; next = n }
        }
      }
      used.add(ek(cur, next))
      const dx = (next % w) - (cur % w)
      const dy = ((next / w) | 0) - ((cur / w) | 0)
      const m = Math.hypot(dx, dy) || 1
      dir = [dx / m, dy / m]
      pts.push(next)
      cur = next
    }
    return pts
  }

  // endpoints first (a pen starts at a loose end), then left-to-right; anything
  // still unused afterwards is a closed loop, seeded from any of its pixels
  const order = idx.slice().sort((a, b) => {
    const ea = deg.get(a) === 1 ? 0 : 1
    const eb = deg.get(b) === 1 ? 0 : 1
    return ea - eb || (a % w) - (b % w) || ((a / w) | 0) - ((b / w) | 0)
  })
  const chains = []
  for (const s of order) while (free(s).length) chains.push(walk(s))
  return chains.filter((c) => c.length > 1)
}

/** Ramer-Douglas-Peucker. */
function simplify(pts, eps) {
  if (pts.length < 3) return pts
  let maxD = 0, idx = 0
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1]
  const dx = bx - ax, dy = by - ay
  const len = Math.hypot(dx, dy) || 1
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len
    if (d > maxD) { maxD = d; idx = i }
  }
  if (maxD <= eps) return [pts[0], pts[pts.length - 1]]
  return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)]
}

/**
 * A skeleton stops short of a sharp brush tip — the medial axis can't reach the
 * point of a wedge — leaving slivers of ink the mask never touches. Push each
 * end outward along its own heading so the pen's round cap covers the tip.
 * Overshoot is free: each stroke masks only its own letterform.
 */
function extendEnds(pts, by) {
  if (pts.length < 2 || by <= 0) return pts
  const out = pts.map((p) => [...p])
  const push = (from, to) => {
    const dx = to[0] - from[0]
    const dy = to[1] - from[1]
    const m = Math.hypot(dx, dy)
    if (!m) return to
    return [to[0] + (dx / m) * by, to[1] + (dy / m) * by]
  }
  out[0] = push(out[1], out[0])
  out[out.length - 1] = push(out[out.length - 2], out[out.length - 1])
  return out
}

/** Polyline -> smooth path, using quadratics through midpoints. */
function toPath(pts) {
  const n = (v) => Math.round(v)
  if (pts.length < 2) return ''
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`
  if (pts.length === 2) return `${d}L${n(pts[1][0])} ${n(pts[1][1])}`
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2
    const my = (pts[i][1] + pts[i + 1][1]) / 2
    d += `Q${n(pts[i][0])} ${n(pts[i][1])} ${n(mx)} ${n(my)}`
  }
  const last = pts[pts.length - 1]
  return `${d}L${n(last[0])} ${n(last[1])}`
}

const pens = []
for (const group of strokes) {
  const { grid, w, h, x0, y0 } = await rasterize(group)
  const D = distances(grid, w, h)
  const sk = thin(smooth(grid, w, h, SMOOTH_PASSES), w, h)
  let radius = 0
  for (let i = 0; i < w * h; i++) if (sk[i] && D[i] > radius) radius = D[i]
  // Chains shorter than the brush radius sit entirely under the disc the pen
  // already sweeps along the trunk, so dropping them costs no coverage (checked
  // by scripts/../check-coverage) and saves a lot of needless sub-paths.
  const minRun = Math.max(2, radius * PRUNE_FACTOR)
  const route = penRoute(sk, w, h).filter((c, i) => i === 0 || c.length >= minRun)
  const paths = []
  for (const chain of route) {
    const pts = chain.map((i) => [(x0 + (i % w)) * OUT_PER_PX, (y0 + ((i / w) | 0)) * OUT_PER_PX])
    const simple = extendEnds(simplify(pts, 1.2 * OUT_PER_PX), radius * OUT_PER_PX * 0.9)
    if (simple.length < 2) continue
    let len = 0
    for (let i = 1; i < simple.length; i++) {
      len += Math.hypot(simple[i][0] - simple[i - 1][0], simple[i][1] - simple[i - 1][1])
    }
    paths.push({ d: toPath(simple), len })
  }
  // A stroke too small to have a skeleton is a single dab of the brush; give it
  // a short path across its own bbox so it still draws (and so `pens` stays
  // index-parallel with `strokes`).
  if (!paths.length) {
    const cx0 = (group.minX * RS + 1) * OUT_PER_PX
    const cy0 = (group.minY * RS + 1) * OUT_PER_PX
    const cx1 = (group.maxX * RS - 1) * OUT_PER_PX
    const cy1 = (group.maxY * RS - 1) * OUT_PER_PX
    paths.push({ d: toPath([[cx0, cy0], [cx1, cy1]]), len: Math.max(1, Math.hypot(cx1 - cx0, cy1 - cy0)) })
  }
  // 1.15x so the mask is a touch wider than the brush: over-covering sideways is
  // invisible (it can only reveal ink that exists), under-covering is permanent.
  // Each stroke gets its OWN mask, so an over-wide brush can never bleed onto
  // the neighbouring letter and reveal it before its turn.
  const width = Math.max(6, Math.round(radius * 2 * OUT_PER_PX * 1.15))
  // Each mask gets a region just big enough for its own stroke plus the brush.
  // The default (bounding-box relative) region can clip a wide brush on a thin
  // stroke, and a full-canvas region on all 34 masks would mean 34 full-size
  // offscreen buffers.
  const pad = width
  const bx = Math.floor(group.minX * S - pad)
  const by = Math.floor(group.minY * S - pad)
  pens.push({
    paths,
    width,
    line: group.line,
    box: [bx, by, Math.ceil(group.w * S + pad * 2), Math.ceil(group.h * S + pad * 2)],
  })
}

// --------------------------------------------------- 4c. handwriting timing
// Constant pen speed is what sells it — long strokes take longer than short
// ones, exactly as a hand would. Gaps are pen lifts.
const WRITE_MS = Number(argOf('duration', 4400))
const LIFT_MS = 26 // pen lift between strokes
const LINE_PAUSE_MS = 280 // the hand travelling back for the second line
const MIN_DUR = 16 // ~one frame; short sub-paths must not be zero-length in time

// Sub-paths WITHIN a stroke are joined at skeleton junctions, so the pen never
// leaves the paper between them — gaps belong between strokes only.
const gapBefore = pens.map((p, i) => (i === 0 ? 0 : p.line !== pens[i - 1].line ? LINE_PAUSE_MS : LIFT_MS))
const totalGaps = gapBefore.reduce((s, g) => s + g, 0)
const totalLen = pens.reduce((s, p) => s + p.paths.reduce((a, q) => a + q.len, 0), 0)

// Two passes: lay the timeline out at constant pen speed, then rescale so the
// MIN_DUR floor on short sub-paths doesn't push the total past the target.
const layout = (msPerUnit) => {
  let clock = 0
  for (const [i, p] of pens.entries()) {
    clock += gapBefore[i]
    for (const q of p.paths) {
      q.t0 = Math.round(clock)
      q.dur = Math.max(MIN_DUR, Math.round(q.len * msPerUnit))
      clock += q.dur
    }
  }
  return clock
}
// The MIN_DUR floor means one rescale isn't enough — each time we speed the pen
// up, more short sub-paths hit the floor and stop shrinking. Converge instead.
let msPerUnit = (WRITE_MS - totalGaps) / totalLen
let writeMs = layout(msPerUnit)
for (let pass = 0; pass < 12 && Math.abs(writeMs - WRITE_MS) > 25; pass++) {
  const drawn = writeMs - totalGaps
  if (drawn <= 0) break
  msPerUnit *= (WRITE_MS - totalGaps) / drawn
  writeMs = layout(msPerUnit)
}
writeMs = Math.round(writeMs)

// -------------------------------------------------------------- 5. emit
// Potrace emits absolute cubics at 3 decimal places, which is wildly more
// precision than a 720px-wide render can resolve. Three compactions, none of
// them visible (verified by pixel diff against the unminified trace):
//
//   1. a 2000-unit viewBox with INTEGER coordinates. At the largest size the
//      mark is ever drawn that is ±0.18px of rounding error. Integers also drop
//      the decimal point entirely.
//   2. relative commands (m/c). Deltas between adjacent curve points are small,
//      so most numbers go from 4 digits to 1-2. This is the big one.
//   3. minimal separators — a minus sign is its own delimiter in the SVG path
//      grammar, so "12-7" needs no space.
//
// Rounding happens BEFORE the deltas are taken, so the deltas sum back to
// exactly the rounded absolutes and no drift accumulates along a path.
const vbH = Math.round(SRC_H * S)
const lineTwoStart = strokes.filter((g) => g.line === 0).length

/** "M x y C ..." (absolute, fractional) -> "Mxy c..." (relative, integer). */
function compact(dStr) {
  const toks = dStr.match(/[MC]|-?\d+\.?\d*/g)
  const out = []
  let cx = 0
  let cy = 0
  let started = false
  const n = (v) => Math.round(v * S)
  // join numbers with the fewest legal separators
  const push = (cmd, nums) => {
    let s = cmd
    for (const v of nums) s += (v < 0 || s === cmd ? '' : ' ') + v
    out.push(s)
  }
  for (let i = 0; i < toks.length; ) {
    if (toks[i] === 'M') {
      const x = n(Number(toks[i + 1]))
      const y = n(Number(toks[i + 2]))
      // first move is absolute; later subpaths in the same group move relatively
      if (!started) push('M', [x, y])
      else push('m', [x - cx, y - cy])
      cx = x
      cy = y
      started = true
      i += 3
    } else if (toks[i] === 'C') {
      const p = []
      for (let k = 0; k < 6; k += 2) {
        p.push(n(Number(toks[i + 1 + k])) - cx, n(Number(toks[i + 2 + k])) - cy)
      }
      push('c', p)
      cx += p[4]
      cy += p[5]
      i += 7
    } else i++
  }
  return out.join('')
}

const file = `// GENERATED ART DATA — do not hand-edit.
//
// Vector trace of the studio's hand-lettered "everything is designed" mark.
// Each entry is one connected brush stroke (letter counters and the dry-brush
// gaps ride along inside the same subpath, punched by fill-rule="evenodd"),
// ordered the way the phrase is written: line 1 left-to-right, then line 2.
// That ordering is what lets the hero reveal it stroke by stroke.
//
// Source: everything_is_designed_sm_960.png -> potrace -> per-stroke split.
// Regenerate with scripts/trace-lettering.mjs.

export const LETTERING_VIEWBOX = '0 0 ${VB} ${vbH}'

/** Index at which the second line ("is designed") begins. */
export const LETTERING_LINE_TWO_START = ${lineTwoStart}

export const LETTERING_STROKES: readonly string[] = [
${strokes.map((g) => `  '${compact(g.subs.join(' '))}',`).join('\n')}
]

/** Total time the phrase takes to write itself, in ms. */
export const LETTERING_WRITE_MS = ${writeMs}

/**
 * The path the brush travelled, recovered by skeletonizing each stroke. Drawn
 * as an animated mask over the letterforms above, so the ink appears at a
 * moving pen tip instead of fading in. \`width\` is that stroke's brush
 * diameter, \`t0\`/\`dur\` its slot in the writing (constant pen speed, so the
 * gaps between them read as pen lifts).
 */
export type LetteringPenStroke = {
  /** Brush diameter, in viewBox units. */
  width: number
  /** Mask region [x, y, width, height] — this stroke's bounds plus the brush. */
  box: readonly [number, number, number, number]
  /** Sub-paths of one continuous pen movement, in the order they are drawn. */
  paths: readonly { d: string; t0: number; dur: number }[]
}

export const LETTERING_PEN: readonly LetteringPenStroke[] = [
${pens
  .map(
    (p) =>
      `  { width: ${p.width}, box: [${p.box.join(', ')}], paths: [${p.paths
        .map((q) => `{ d: '${q.d}', t0: ${q.t0}, dur: ${q.dur} }`)
        .join(', ')}] },`,
  )
  .join('\n')}
]
`

writeFileSync(OUT, file)

console.log(`subpaths traced   ${parts.length}`)
console.log(`ink strokes       ${strokes.length}  (line 1: ${lineTwoStart}, line 2: ${strokes.length - lineTwoStart})`)
console.log(`counters attached ${attached}${orphaned ? `  orphaned: ${orphaned}` : ''}`)
console.log(`isolated dust     ${dust.length} dropped`)
console.log(`pen sub-paths     ${pens.reduce((s, p) => s + p.paths.length, 0)}  over ${writeMs}ms of writing`)
console.log(`brush width       ${Math.min(...pens.map((p) => p.width))}-${Math.max(...pens.map((p) => p.width))} units`)
console.log(`split at y        ${Math.round(split)}  (gap ${Math.round(bestGap)})`)
console.log(`wrote             ${path.relative(repoRoot, OUT)}  (${(file.length / 1024).toFixed(0)}kB)`)
