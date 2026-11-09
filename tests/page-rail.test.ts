import { describe, expect, it } from 'vitest'
import { railBands, railBox, railTargets } from '@/components/home-story/HumanPageControls'

/** Rule: the homepage's side rail never runs into the footer. */
describe('page rail', () => {
  it('sits centred at 48% of the window while the footer is out of view', () => {
    expect(railBox(1000, Infinity)).toEqual({ top: 260, height: 480 })
    expect(railBox(1000, 2000)).toEqual({ top: 260, height: 480 })
  })

  it('shortens to end above the footer as it comes up', () => {
    const box = railBox(1000, 600)
    expect(box.top).toBe(260)
    expect(box.top + box.height).toBeLessThanOrEqual(600 - 32)
  })

  it('slides up, never through the footer, once it is as short as it gets', () => {
    const box = railBox(1000, 300)
    expect(box.height).toBe(160)
    expect(box.top + box.height).toBeLessThanOrEqual(300 - 32)
  })

  it('turns light exactly where a dark band passes behind it', () => {
    const rail = { top: 200, height: 400 }
    // A band from 300 to 500 covers the middle half of the rail.
    expect(railBands(rail, [{ top: 300, bottom: 500 }])).toEqual([{ start: 25, end: 75 }])
    // Overhanging either end is clipped to the rail.
    expect(railBands(rail, [{ top: 0, bottom: 260 }])).toEqual([{ start: 0, end: 15 }])
    // A band off screen does not draw.
    expect(railBands(rail, [{ top: 900, bottom: 1400 }])).toEqual([])
  })

  it('gives each dot its own stretch of the rail, so pointing at a dot picks that dot', () => {
    const positions = [10, 14, 20, 60, 90]
    const targets = railTargets(positions, 6)
    positions.forEach((at, index) => {
      // The dot is inside its own target and no other.
      const owners = targets.filter(target => target.start <= at && at < target.end)
      expect(owners).toEqual([targets[index]])
    })
    // Neighbours meet at the midpoint; lone dots keep the full reach.
    expect(targets[0]).toEqual({ start: 4, end: 12 })
    expect(targets[3]).toEqual({ start: 54, end: 66 })
  })
})
