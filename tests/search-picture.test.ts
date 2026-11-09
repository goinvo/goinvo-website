import { inflateSync, deflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { cropLoss, edgeBlock, edgeRects, focusPosition, imageShape, onePixelColor, pictureFit, MAX_PICTURE_CROP, SEARCH_PICTURE_FRAME } from '@/lib/search/picture'

const FRAME = SEARCH_PICTURE_FRAME

/** A 1×1 truecolour PNG, as Sanity serves an edge strip shrunk to one pixel. */
function onePixelPng(rgb: [number, number, number], colorType = 2): Uint8Array {
  const chunk = (kind: string, body: Buffer) => {
    const length = Buffer.alloc(4); length.writeUInt32BE(body.length)
    return Buffer.concat([length, Buffer.from(kind, 'ascii'), body, Buffer.alloc(4)])
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = colorType
  const row = Buffer.from([0, ...rgb, ...(colorType === 6 ? [255] : [])])
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(row)), chunk('IEND', Buffer.alloc(0))])
}

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
    // The editor's card position wins, as on the site's own cards.
    expect(focusPosition(focus, 'top center')).toBe('top center')
  })

  it('never cuts lettering mid-word: "Pay the Patient" (1200×435) shows whole', () => {
    const aspect = imageShape({ asset: { _ref: 'image-abc-1200x435-png' } }).aspect
    expect(cropLoss(aspect!, FRAME)).toBeGreaterThan(MAX_PICTURE_CROP)
    expect(pictureFit(aspect, FRAME)).toBe('whole')
  })

  it('no picture loses more than a quarter of itself to its frame', () => {
    expect(MAX_PICTURE_CROP).toBeLessThanOrEqual(0.25)
    expect(pictureFit(2.07, FRAME)).toBe('fill') // human-centered-design-for-ai, the usual lead: loses 23%
    expect(pictureFit(1.25, FRAME)).toBe('fill') // determinants-of-health poster: loses 22%
    expect(pictureFit(2.47, FRAME)).toBe('whole') // prior-auth would lose 35%
    expect(pictureFit(2.95, FRAME)).toBe('whole') // ahrq-cds: a wide screenshot
    expect(pictureFit(1.02, FRAME)).toBe('whole') // a square map would lose 36%
  })

  it('keeps filling when the shape is unknown (older stored answers)', () => {
    expect(pictureFit(undefined, FRAME)).toBe('fill')
    expect(pictureFit(Number.NaN, FRAME)).toBe('fill')
  })

  it('samples the edges a whole picture leaves showing, inside the editor crop', () => {
    // Wide: the frame shows above and below, so the top and bottom strips.
    expect(edgeRects(1200, 435, undefined, FRAME)).toEqual({ side: 'tb', rects: [[0, 0, 1200, 9], [0, 426, 1200, 9]] })
    // Tall (a square in a 16:10 frame): either side.
    expect(edgeRects(1000, 1000, undefined, FRAME)).toEqual({ side: 'lr', rects: [[0, 0, 20, 1000], [980, 0, 20, 1000]] })
    // Cropped: the strips sit inside what is kept.
    expect(edgeRects(2000, 1000, { top: 0.1, bottom: 0, left: 0.25, right: 0 }, FRAME)?.rects[0]).toEqual([500, 100, 1500, 18])
  })

  it('reads the colour of a one-pixel PNG, with or without alpha', () => {
    const inflate = (data: Uint8Array) => inflateSync(data)
    expect(onePixelColor(onePixelPng([254, 251, 255]), inflate)).toBe('#fefbff')
    expect(onePixelColor(onePixelPng([7, 20, 33], 6), inflate)).toBe('#071421')
    expect(onePixelColor(new Uint8Array([1, 2, 3]), inflate)).toBeUndefined()
  })

  it('fills the rest of the frame with each edge colour on its own half', () => {
    expect(edgeBlock({ side: 'tb', colors: ['#ffffff', '#ffffff'] })).toBe('#ffffff')
    expect(edgeBlock({ side: 'tb', colors: ['#d6dfef', '#ececec'] })).toBe('linear-gradient(to bottom, #d6dfef 50%, #ececec 50%)')
    expect(edgeBlock({ side: 'lr', colors: ['#000000', '#111111'] })).toBe('linear-gradient(to right, #000000 50%, #111111 50%)')
    expect(edgeBlock(undefined)).toBeUndefined()
  })
})
