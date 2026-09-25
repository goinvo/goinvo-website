/**
 * The marketing suite's data palette: one set of colour roles for every chart
 * in the Studio, the gated plan pages and the Slack cards.
 *
 * Rooted in GoInvo's own colours (teal `#007385`, orange `#b84a0e`) but not
 * equal to them: the brand hexes are too muted to carry identity in a chart
 * (teal sits at OKLCH chroma 0.09, below the 0.10 floor where a hue starts to
 * read as grey). Every value here was produced in OKLCH and run through the
 * dataviz validator, in both modes, against the Studio's own card surfaces
 * (`#ffffff` light, `#101112` dark):
 *
 *   categorical, adjacent pairs   worst CVD ΔE 16.0 light / 15.9 dark (target 8)
 *                                 worst normal ΔE 23.2 light / 21.5 dark (floor 15)
 *   categorical, first 3 all-pairs  CVD ΔE 12.6 light / 8.3 dark — so scatter-like
 *                                 forms (any two marks can touch) cap at three series
 *   ordinal, 6 steps              monotone, every gap ΔL >= 0.06, light end >= 2:1
 *
 * Slot 4 (gold) sits under 3:1 on the light surface: wherever it is used the
 * value is also printed or in the table view (the "relief" rule).
 *
 * Rules the components rely on, so a new chart does not undo them:
 *  - Categorical slots are assigned in this order and never cycled. A sixth
 *    series folds into "Other".
 *  - Colour follows the entity, never its rank: callers pass a stable slot.
 *  - Text never wears a series colour — values and labels use the ink tokens,
 *    and a swatch beside the text carries identity.
 *  - Status colours mean good/warning/serious/critical and nothing else, and
 *    always come with a word (and usually an icon).
 */

export type VizScheme = 'light' | 'dark'

export type VizTokens = {
  scheme: VizScheme
  surface: string
  ink: string
  secondary: string
  muted: string
  grid: string
  baseline: string
  /** Context marks in an emphasis chart: "everything that is not the point". */
  deemphasis: string
  /** The unfilled part of a meter — a light step of the fill's own hue. */
  track: string
  /** Hairline ring around a card. */
  border: string
  /** Text for a delta that is good news (never the series green). */
  deltaGood: string
  categorical: readonly string[]
  /** Six ordered steps, earliest stage first (light→dark on light, dark→light on dark). */
  ordinal: readonly string[]
  /** Continuous magnitude, near-zero first. */
  sequential: readonly string[]
  status: { good: string; warning: string; serious: string; critical: string }
}

const LIGHT: VizTokens = {
  scheme: 'light',
  surface: '#ffffff',
  ink: '#101112',
  secondary: '#4d5561',
  muted: '#69717c',
  grid: '#e6e8eb',
  baseline: '#c4c9cf',
  deemphasis: '#c9ced4',
  track: '#d9eef3',
  border: 'rgba(16,17,18,0.10)',
  deltaGood: '#0f7a36',
  categorical: ['#007f9a', '#d45d23', '#5247b0', '#d59800', '#cd568b'],
  ordinal: ['#7ebece', '#4dacc1', '#0099b4', '#00839e', '#006e89', '#005a74'],
  sequential: ['#eef8fa', '#cfeef7', '#95d7e7', '#46b5ce', '#0091ad', '#006f87', '#005063', '#003341'],
  status: { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' },
}

const DARK: VizTokens = {
  scheme: 'dark',
  surface: '#101112',
  ink: '#f4f5f6',
  secondary: '#b9bfc7',
  muted: '#8a919b',
  grid: '#25282c',
  baseline: '#3a3f45',
  deemphasis: '#454b52',
  track: '#12323b',
  border: 'rgba(255,255,255,0.10)',
  deltaGood: '#4cc36b',
  categorical: ['#009eb9', '#d45d23', '#7b77dd', '#bd8708', '#bf4a7f'],
  ordinal: ['#005e78', '#00738d', '#0088a3', '#009db7', '#59b0c4', '#87c2d1'],
  sequential: ['#15191b', '#003341', '#004151', '#005f75', '#007f9a', '#0ca3be', '#6ec6db', '#b6e4f0'],
  status: { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' },
}

export function vizTokens(scheme: VizScheme = 'light'): VizTokens {
  return scheme === 'dark' ? DARK : LIGHT
}

/** Categorical slot colour, by a STABLE slot number (never by rank in the current view). */
export function seriesColor(tokens: VizTokens, slot: number): string {
  if (!Number.isInteger(slot) || slot < 0 || slot >= tokens.categorical.length) return tokens.deemphasis
  return tokens.categorical[slot]
}

/**
 * The colour of a magnitude on the sequential ramp. `t` is 0..1; 0 is "none"
 * and gets the first step, which is allowed to sit close to the surface.
 */
export function sequentialColor(tokens: VizTokens, t: number): string {
  return tokens.sequential[sequentialStep(t, tokens.sequential.length)]
}

/** 0-based step on an n-step sequential ramp; 0 is reserved for "none". */
export function sequentialStep(t: number, steps = 8): number {
  if (!Number.isFinite(t) || t <= 0) return 0
  return Math.min(steps - 1, 1 + Math.floor(Math.min(1, t) * (steps - 1 - 1e-9)))
}

/** Ordinal step for stage `index` of `count` stages, spread across the six steps. */
export function ordinalColor(tokens: VizTokens, index: number, count: number): string {
  const steps = tokens.ordinal
  if (count <= 1) return steps[steps.length - 1]
  const clamped = Math.max(0, Math.min(count - 1, index))
  return steps[Math.round((clamped / (count - 1)) * (steps.length - 1))]
}

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const LABEL_LIGHT = '#ffffff'
const LABEL_DARK = '#101112'

/**
 * Text set INSIDE a coloured mark is the one place a label sits on data
 * colour; it takes white or near-black, whichever reads better on that fill.
 */
export function labelInkOn(fill: string): string {
  return contrastRatio(LABEL_LIGHT, fill) >= contrastRatio(LABEL_DARK, fill) ? LABEL_LIGHT : LABEL_DARK
}

/** CSS custom properties for a chart scope, so markup is written against roles, not hex. */
export function vizCssVars(tokens: VizTokens): Record<string, string> {
  const vars: Record<string, string> = {
    '--viz-surface': tokens.surface,
    '--viz-ink': tokens.ink,
    '--viz-secondary': tokens.secondary,
    '--viz-muted': tokens.muted,
    '--viz-grid': tokens.grid,
    '--viz-baseline': tokens.baseline,
    '--viz-deemphasis': tokens.deemphasis,
    '--viz-track': tokens.track,
    '--viz-border': tokens.border,
    '--viz-delta-good': tokens.deltaGood,
    '--viz-good': tokens.status.good,
    '--viz-warning': tokens.status.warning,
    '--viz-serious': tokens.status.serious,
    '--viz-critical': tokens.status.critical,
  }
  tokens.categorical.forEach((hex, i) => {
    vars[`--viz-series-${i + 1}`] = hex
    vars[`--viz-on-series-${i + 1}`] = labelInkOn(hex)
  })
  tokens.sequential.forEach((hex, i) => {
    vars[`--viz-seq-${i + 1}`] = hex
    vars[`--viz-on-seq-${i + 1}`] = labelInkOn(hex)
  })
  tokens.ordinal.forEach((hex, i) => {
    vars[`--viz-ordinal-${i + 1}`] = hex
    vars[`--viz-on-ordinal-${i + 1}`] = labelInkOn(hex)
  })
  return vars
}
