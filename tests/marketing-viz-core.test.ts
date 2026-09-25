import { describe, expect, it } from 'vitest'

import { compactMoney, compactNumber, formatDelta, formatMinutes, formatPercent } from '@/lib/marketing/viz/format'
import { estimateTextWidth, labelFits, linear, niceTicks, stackSegments } from '@/lib/marketing/viz/scale'
import { ordinalColor, seriesColor, sequentialColor, vizCssVars, vizTokens } from '@/lib/marketing/viz/tokens'

describe('the data palette', () => {
  it('has the same roles in both modes, and dark is its own steps rather than a flip', () => {
    const light = vizTokens('light')
    const dark = vizTokens('dark')
    expect(Object.keys(vizCssVars(light)).sort()).toEqual(Object.keys(vizCssVars(dark)).sort())
    expect(light.categorical).toHaveLength(dark.categorical.length)
    expect(light.ordinal).toHaveLength(6)
    expect(dark.ordinal).toHaveLength(6)
    expect(light.surface).not.toBe(dark.surface)
  })

  it('never cycles a categorical slot: past the palette, a series is context grey', () => {
    const t = vizTokens('light')
    expect(seriesColor(t, 0)).toBe(t.categorical[0])
    expect(seriesColor(t, t.categorical.length)).toBe(t.deemphasis)
    expect(seriesColor(t, -1)).toBe(t.deemphasis)
  })

  it('reads ordinal stages first to last across the whole ramp', () => {
    const t = vizTokens('light')
    expect(ordinalColor(t, 0, 6)).toBe(t.ordinal[0])
    expect(ordinalColor(t, 5, 6)).toBe(t.ordinal[5])
    expect(ordinalColor(t, 0, 2)).toBe(t.ordinal[0])
    expect(ordinalColor(t, 1, 2)).toBe(t.ordinal[5])
  })

  it('keeps zero at the near-surface step and saturates at the top', () => {
    const t = vizTokens('light')
    expect(sequentialColor(t, 0)).toBe(t.sequential[0])
    expect(sequentialColor(t, 0.0001)).toBe(t.sequential[1])
    expect(sequentialColor(t, 1)).toBe(t.sequential[t.sequential.length - 1])
    expect(sequentialColor(t, 5)).toBe(t.sequential[t.sequential.length - 1])
  })
})

describe('scales and ticks', () => {
  it('maps a domain onto a range', () => {
    const x = linear([0, 10], [0, 200])
    expect(x(5)).toBe(100)
    expect(linear([3, 3], [10, 20])(3)).toBe(10)
  })

  it('rounds axes to clean numbers', () => {
    expect(niceTicks(7)).toEqual({ max: 8, ticks: [0, 2, 4, 6, 8] })
    expect(niceTicks(23).ticks).toEqual([0, 10, 20, 30])
    expect(niceTicks(0)).toEqual({ max: 1, ticks: [0, 1] })
    expect(niceTicks(940).max).toBe(1000)
  })
})

describe('stackSegments', () => {
  it('separates touching segments with a 2px surface gap and never overruns the track', () => {
    const segments = stackSegments([{ v: 60 }, { v: 30 }, { v: 10 }], (d) => d.v, { width: 300 })
    expect(segments).toHaveLength(3)
    expect(segments[1].x).toBeCloseTo(segments[0].x + segments[0].width + 2)
    const end = segments[2].x + segments[2].width
    expect(end).toBeLessThanOrEqual(300.0001)
  })

  it('drops zero values instead of drawing a sliver between two gaps', () => {
    expect(stackSegments([{ v: 0 }, { v: 5 }], (d) => d.v, { width: 100 })).toHaveLength(1)
    expect(stackSegments([], (d: { v: number }) => d.v, { width: 100 })).toEqual([])
  })

  it('leaves the unfilled remainder of a budget as track', () => {
    const segments = stackSegments([{ v: 60 }, { v: 60 }], (d) => d.v, { width: 242, total: 240 })
    const end = segments[1].x + segments[1].width
    expect(end).toBeCloseTo(122, 0)
  })

  it('keeps a tiny real share visible', () => {
    const segments = stackSegments([{ v: 999 }, { v: 1 }], (d) => d.v, { width: 200, minWidth: 3 })
    expect(segments[1].width).toBeGreaterThanOrEqual(3)
    expect(segments[1].x + segments[1].width).toBeLessThanOrEqual(200.0001)
  })

  it('judges label fit with padding on both sides', () => {
    expect(labelFits('Outreach', 200)).toBe(true)
    expect(labelFits('Outreach', estimateTextWidth('Outreach') + 4)).toBe(false)
  })
})

describe('formats', () => {
  it('compacts large figures', () => {
    expect(compactNumber(1284)).toBe('1,284')
    expect(compactNumber(12_900)).toBe('12.9K')
    expect(compactMoney(4_200_000)).toBe('$4.2M')
    expect(compactMoney(40_000)).toBe('$40K')
  })

  it('writes time as hours and minutes', () => {
    expect(formatMinutes(200)).toBe('3h 20m')
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(120)).toBe('2h')
    expect(formatMinutes(0)).toBe('0m')
  })

  it('never rounds a real share down to nothing', () => {
    expect(formatPercent(0.004)).toBe('<1%')
    expect(formatPercent(0.456)).toBe('46%')
  })

  it('signs deltas against a named period', () => {
    expect(formatDelta(7, 4)).toBe('+3 vs last week')
    expect(formatDelta(2, 4)).toBe('−2 vs last week')
    expect(formatDelta(4, 4)).toBe('same as last week')
  })
})
