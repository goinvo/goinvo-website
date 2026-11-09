import { inflateSync, deflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { cropLoss, edgeBlock, edgeSampleQuery, focusPosition, imageShape, pictureFit, pngEndColors, MAX_PICTURE_CROP, SEARCH_PICTURE_FRAME } from '@/lib/search/picture'

const FRAME = SEARCH_PICTURE_FRAME

/** A small truecolour PNG, each row written with the given row filter, as Sanity might. */
function png(rows: number[][][], filter = 0, colorType = 2): Uint8Array {
  const chunk = (kind: string, body: Buffer) => {
    const length = Buffer.alloc(4); length.writeUInt32BE(body.length)
    return Buffer.concat([length, Buffer.from(kind, 'ascii'), body, Buffer.alloc(4)])
  }
  const bpp = colorType === 6 ? 4 : 3, width = rows[0].length
  const flat = rows.map(row => row.flatMap(pixel => colorType === 6 ? [...pixel, 255] : pixel))
  const encoded = flat.flatMap((row, y) => [filter, ...row.map((value, x) => {
    const a = x >= bpp ? row[x - bpp] : 0, b = y ? flat[y - 1][x] : 0, c = x >= bpp && y ? flat[y - 1][x - bpp] : 0
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
    const predicted = filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : filter === 4 ? (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) : 0
    return (value - predicted) & 255
  })])
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(rows.length, 4); header[8] = 8; header[9] = colorType
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.from(encoded))), chunk('IEND', Buffer.alloc(0))])
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

  it("asks for a wide picture's top and bottom edges, a tall one's sides, inside the editor crop", () => {
    expect(edgeSampleQuery(1200, 435, undefined, FRAME)).toEqual({ side: 'tb', query: 'w=1&h=50&fit=scale&fm=png' })
    expect(edgeSampleQuery(1000, 1000, undefined, FRAME)).toEqual({ side: 'lr', query: 'w=50&h=1&fit=scale&fm=png' })
    expect(edgeSampleQuery(2000, 1000, { top: 0.1, bottom: 0, left: 0.25, right: 0 }, FRAME)?.query).toBe('rect=500,100,1500,900&w=1&h=50&fit=scale&fm=png')
  })

  it('reads the first and last pixels of a PNG under every row filter, with or without alpha', () => {
    const inflate = (data: Uint8Array) => inflateSync(data)
    const column = [[[254, 251, 255]], [[120, 60, 30]], [[7, 20, 33]]]
    const row = [[[86, 86, 86], [200, 10, 90], [127, 125, 123]]]
    for (const filter of [0, 1, 2, 3, 4]) {
      expect(pngEndColors(png(column, filter), inflate)).toEqual(['#fefbff', '#071421'])
      expect(pngEndColors(png(row, filter, 6), inflate)).toEqual(['#565656', '#7f7d7b'])
    }
    expect(pngEndColors(new Uint8Array([1, 2, 3]), inflate)).toBeUndefined()
  })

  it('fills the rest of the frame with each edge colour on its own half', () => {
    expect(edgeBlock({ side: 'tb', colors: ['#ffffff', '#ffffff'] })).toBe('#ffffff')
    expect(edgeBlock({ side: 'tb', colors: ['#d6dfef', '#ececec'] })).toBe('linear-gradient(to bottom, #d6dfef 50%, #ececec 50%)')
    expect(edgeBlock({ side: 'lr', colors: ['#000000', '#111111'] })).toBe('linear-gradient(to right, #000000 50%, #111111 50%)')
    expect(edgeBlock(undefined)).toBeUndefined()
  })
})
