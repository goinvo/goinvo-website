import { describe, expect, it } from 'vitest'
import { railBox } from '@/components/home-story/HumanPageControls'

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
})
