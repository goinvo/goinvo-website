/**
 * Number formats for the charts. Big standalone figures are compact (1,284 /
 * 12.9K / $4.2M); time is hours and minutes, never "2.3333h".
 */

export function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return '–'
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : ''
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)}M`
  if (abs >= 10_000) return `${sign}${trim(abs / 1_000)}K`
  return `${sign}${Math.round(abs).toLocaleString('en-US')}`
}

export function compactMoney(value: number): string {
  if (!Number.isFinite(value)) return '–'
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : ''
  if (abs >= 1_000_000) return `${sign}$${trim(abs / 1_000_000)}M`
  if (abs >= 1_000) return `${sign}$${trim(abs / 1_000)}K`
  return `${sign}$${Math.round(abs)}`
}

function trim(value: number): string {
  return value >= 100 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, '')
}

/** 200 → "3h 20m", 45 → "45m", 120 → "2h". */
export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0m'
  const rounded = Math.round(minutes)
  const hours = Math.floor(rounded / 60)
  const rest = rounded % 60
  if (!hours) return `${rest}m`
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

/** 0.4567 → "46%". Tiny non-zero shares say "<1%" rather than a false 0. */
export function formatPercent(share: number): string {
  if (!Number.isFinite(share) || share <= 0) return '0%'
  if (share < 0.01) return '<1%'
  return `${Math.round(share * 100)}%`
}

/** A signed delta against a named period: "+3 vs last week", "−2 vs last week", "same as last week". */
export function formatDelta(current: number, previous: number, period = 'last week'): string {
  const delta = Math.round(current - previous)
  if (!delta) return `same as ${period}`
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta)} vs ${period}`
}

/**
 * A delta against a period that has finished, for a period that has not. A
 * Thursday is never "down" on last week — it has three days left — so a lower
 * number is reported as the target still to beat, not as a drop.
 */
export function formatRunningDelta(current: number, previous: number, period = 'last week'): string {
  if (current >= previous) return formatDelta(current, previous, period)
  return `${previous} ${period} — the week is not over`
}
