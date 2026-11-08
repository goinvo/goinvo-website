import { describe, expect, it } from 'vitest'
import { cropLoss, focusPosition, imageShape, pictureFit, MAX_PICTURE_CROP } from '@/lib/search/picture'

const CARD = 2
const FEATURE = 16 / 10

describe('search result pictures', () => {
  it('reads the served shape from the asset id, after the editor crop', () => {
    expect(imageShape({ asset: { _ref: 'image-abc-1200x435-png' } }).aspect).toBeCloseTo(2.759, 3)
    // Half the width cropped away halves the aspect.
    expect(imageShape({ asset: { _ref: 'image-abc-2000x1000-jpg' }, crop: { left: 0.25, right: 0.25, top: 0, bottom: 0 } }).aspect).toBe(1)
    expect(imageShape({ asset: { _ref: 'not-an-image' } })).toEqual({})
    expect(imageShape(undefined)).toEqual({})
  })

  it('moves the focal point into the cropped image', () => {
    const { focus } = imageShape({ asset: { _ref: 'image-abc-2000x1000-jpg' }, crop: { left: 0.5, right: 0, top: 0, bottom: 0 }, hotspot: { x: 0.75, y: 0.2 } })
    expect(focus).toEqual({ x: 0.5, y: 0.2 })
    expect(focusPosition(focus)).toBe('50% 20%')
    expect(focusPosition(undefined)).toBe('50% 50%')
  })

  it('never cuts lettering mid-word: "The Patient" banner (1200×435) shows whole in a card and as the lead', () => {
    const aspect = imageShape({ asset: { _ref: 'image-abc-1200x435-png' } }).aspect
    expect(cropLoss(aspect!, CARD)).toBeGreaterThan(MAX_PICTURE_CROP)
    expect(pictureFit(aspect, CARD)).toBe('whole')
    expect(pictureFit(aspect, FEATURE)).toBe('whole')
  })

  it('fills the frame when the crop is small, either way round', () => {
    expect(pictureFit(2, CARD)).toBe('fill')
    expect(pictureFit(2.4, CARD)).toBe('fill')
    expect(pictureFit(1.7, CARD)).toBe('fill')
    expect(pictureFit(1.02, CARD)).toBe('whole') // a square poster
    expect(pictureFit(1.5, FEATURE)).toBe('fill')
  })

  it('keeps filling when the shape is unknown (older stored answers)', () => {
    expect(pictureFit(undefined, CARD)).toBe('fill')
    expect(pictureFit(Number.NaN, CARD)).toBe('fill')
  })
})
