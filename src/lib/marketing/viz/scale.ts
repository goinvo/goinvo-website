/**
 * The small amount of geometry the marketing charts need, kept pure so it can
 * be unit-tested without a DOM: scales, clean ticks, and the 2px surface gap
 * between touching marks.
 */

/** Map a value in [d0, d1] to [r0, r1]. A zero-width domain maps everything to r0. */
export function linear(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0
  return (value: number) => (span === 0 ? r0 : r0 + ((value - d0) / span) * (r1 - r0))
}

/**
 * A clean upper bound and ticks for a 0-based axis: 0 / 5 / 10, 0 / 20 / 40,
 * 0 / 250 / 500 — never 0 / 7 / 14. `target` is roughly how many intervals.
 */
export function niceTicks(max: number, target = 4): { max: number; ticks: number[] } {
  if (!Number.isFinite(max) || max <= 0) return { max: 1, ticks: [0, 1] }
  const rough = max / Math.max(1, target)
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude
  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  return { max: top, ticks }
}

export type Segment<T> = { item: T; value: number; x: number; width: number }

/**
 * Lay touching segments along a track, separated by a surface gap. Zero and
 * negative values take no space and produce no segment (a 0-width sliver with
 * two gaps around it reads as a mark). A segment never shrinks below `minWidth`
 * when it has a value, so a small but real share stays visible and hoverable.
 */
export function stackSegments<T>(
  items: T[],
  valueOf: (item: T) => number,
  options: { width: number; total?: number; gap?: number; minWidth?: number },
): Segment<T>[] {
  const gap = options.gap ?? 2
  const minWidth = options.minWidth ?? 3
  const present = items
    .map((item) => ({ item, value: Math.max(0, Number(valueOf(item)) || 0) }))
    .filter((entry) => entry.value > 0)
  if (!present.length || options.width <= 0) return []
  const sum = present.reduce((acc, entry) => acc + entry.value, 0)
  const total = Math.max(sum, options.total ?? 0)
  // The gaps come out of the drawn width so the stack never overruns its track.
  const usable = Math.max(0, options.width - gap * (present.length - 1))
  const raw = present.map((entry) => Math.max(minWidth, (entry.value / total) * usable))
  // Minimum widths can push the sum over what is usable; take it back
  // proportionally from the segments that can afford it.
  const drawn = raw.reduce((acc, w) => acc + w, 0)
  const budget = (sum / total) * usable
  const over = drawn - budget
  const widths =
    over > 0.001
      ? (() => {
          const flexible = raw.map((w) => Math.max(0, w - minWidth))
          const room = flexible.reduce((acc, w) => acc + w, 0)
          return raw.map((w, i) => (room > 0 ? w - (flexible[i] / room) * Math.min(over, room) : w))
        })()
      : raw
  let x = 0
  return present.map((entry, i) => {
    const segment = { item: entry.item, value: entry.value, x, width: widths[i] }
    x += widths[i] + gap
    return segment
  })
}

/**
 * Whether a label fits inside a mark with comfortable padding. Measured in a
 * browser, estimated generously elsewhere: a label wrongly judged to fit gets
 * clipped, one wrongly judged not to fit just moves to the tooltip and the
 * table. Labels inside marks are set semibold, so that is the default weight.
 */
export function labelFits(text: string, markWidth: number, fontSize = 12, padding = 6, weight: number | string = 600): boolean {
  return estimateTextWidth(text, fontSize, weight) + padding * 2 <= markWidth
}

export function estimateTextWidth(text: string, fontSize = 12, weight: number | string = 400): number {
  const measured = measureText(text, fontSize, weight)
  if (measured !== null) return measured
  // No canvas (a server render, a test): err wide, since an under-estimate clips.
  const perChar = Number(weight) >= 600 ? 0.64 : 0.6
  return Array.from(String(text)).length * fontSize * perChar
}

let measureContext: CanvasRenderingContext2D | null | undefined

/** The real rendered width in the chart font, where a browser can tell us. */
function measureText(text: string, fontSize: number, weight: number | string): number | null {
  if (measureContext === undefined) {
    measureContext =
      typeof document !== 'undefined' && typeof document.createElement === 'function'
        ? (document.createElement('canvas').getContext?.('2d') ?? null)
        : null
  }
  if (!measureContext) return null
  measureContext.font = `${weight} ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  return measureContext.measureText(String(text)).width
}
