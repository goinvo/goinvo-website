/**
 * A result's picture, by its real shape. The project images are mostly wide banners
 * (from square to over 4:1, around 2:1 typical), and some are lettering, so a fixed crop
 * cuts words in half ("THE PATIE…"). Each result carries its image's shape and the
 * editor's focal point, and the card decides per picture: fill the frame when the crop
 * would be small, otherwise show the whole image on a block of its own edge colour, so
 * the frame still reads as full and the eye goes to the picture. Shared with the client:
 * no Node imports here (the PNG reader takes its inflate as an argument).
 */

export interface PictureFocus {
  x: number
  y: number
}

interface ImageFields {
  asset?: { _ref?: string }
  crop?: { top?: number; bottom?: number; left?: number; right?: number }
  hotspot?: { x?: number; y?: number }
}

/** Width over height of the image as it is served (after the editor's crop), and the
 * editor's focal point inside it. Sanity asset ids carry the pixel size: image-<id>-WxH-ext. */
export function imageShape(image?: ImageFields | null): { aspect?: number; focus?: PictureFocus } {
  const size = /-(\d+)x(\d+)-[a-z0-9]+$/i.exec(image?.asset?._ref ?? '')
  if (!size) return {}
  const crop = { top: image?.crop?.top ?? 0, bottom: image?.crop?.bottom ?? 0, left: image?.crop?.left ?? 0, right: image?.crop?.right ?? 0 }
  const keptWidth = 1 - crop.left - crop.right
  const keptHeight = 1 - crop.top - crop.bottom
  if (keptWidth <= 0 || keptHeight <= 0) return {}
  const aspect = Math.round(((Number(size[1]) * keptWidth) / (Number(size[2]) * keptHeight)) * 1000) / 1000
  const hotspot = image?.hotspot
  if (typeof hotspot?.x !== 'number' || typeof hotspot?.y !== 'number') return { aspect }
  const clamp = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 1000) / 1000
  return { aspect, focus: { x: clamp((hotspot.x - crop.left) / keptWidth), y: clamp((hotspot.y - crop.top) / keptHeight) } }
}

/** Every search picture's frame, width over height: the site cards' 16:10. */
export const SEARCH_PICTURE_FRAME = 16 / 10

/** The most of itself a picture may lose to fill its frame: a quarter. Past that it shows
 * whole on a block of its own edge colour (wide lettering like Pay the Patient runs edge
 * to edge, so any real crop cuts a letter). */
export const MAX_PICTURE_CROP = 0.25

/** How much of the image filling the frame would cut away, 0 to 1. */
export function cropLoss(imageAspect: number, frameAspect: number): number {
  return imageAspect > frameAspect ? 1 - frameAspect / imageAspect : 1 - imageAspect / frameAspect
}

/** Fill the frame, or show the whole image. An unknown shape fills, as before. */
export function pictureFit(imageAspect: number | undefined, frameAspect: number): 'fill' | 'whole' {
  if (!imageAspect || !Number.isFinite(imageAspect)) return 'fill'
  return cropLoss(imageAspect, frameAspect) > MAX_PICTURE_CROP ? 'whole' : 'fill'
}

/** CSS object-position: the editor's card position when set (features have one, as on
 * the site's cards), else the image's focal point, else the centre. */
export function focusPosition(focus?: PictureFocus, position?: string): string {
  if (position?.trim()) return position.trim()
  return focus ? `${Math.round(focus.x * 100)}% ${Math.round(focus.y * 100)}%` : '50% 50%'
}

/** Where a whole picture leaves its frame showing: above and below a wide one, either
 * side of a tall one. The block takes the colour of the picture's own edge on that side. */
export type PictureEdges = { side: 'tb' | 'lr'; colors: [string, string] }

/** The two edge strips to sample, as Sanity rect=x,y,w,h in source pixels (inside the
 * editor's crop): 2% of the picture deep, its full length. */
export function edgeRects(width: number, height: number, crop: { top?: number; bottom?: number; left?: number; right?: number } | undefined, frameAspect: number): { side: PictureEdges['side']; rects: [number[], number[]] } | undefined {
  const left = Math.round(width * (crop?.left ?? 0)), top = Math.round(height * (crop?.top ?? 0))
  const w = Math.round(width * (1 - (crop?.left ?? 0) - (crop?.right ?? 0))), h = Math.round(height * (1 - (crop?.top ?? 0) - (crop?.bottom ?? 0)))
  if (w < 1 || h < 1) return undefined
  if (w / h >= frameAspect) {
    const depth = Math.max(1, Math.round(h * 0.02))
    return { side: 'tb', rects: [[left, top, w, depth], [left, top + h - depth, w, depth]] }
  }
  const depth = Math.max(1, Math.round(w * 0.02))
  return { side: 'lr', rects: [[left, top, depth, h], [left + w - depth, top, depth, h]] }
}

/** The one pixel of a 1×1 PNG as #rrggbb (8-bit truecolour, with or without alpha). With a
 * single pixel every row filter reduces to the raw bytes, so this needs no decoder. */
export function onePixelColor(png: Uint8Array, inflate: (data: Uint8Array) => Uint8Array): string | undefined {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  let offset = 8, colorType = -1, bitDepth = 0
  const data: Uint8Array[] = []
  while (offset + 8 <= png.length) {
    const length = view.getUint32(offset), kind = String.fromCharCode(...png.subarray(offset + 4, offset + 8)), body = png.subarray(offset + 8, offset + 8 + length)
    if (kind === 'IHDR') { if (view.getUint32(offset + 8) !== 1 || view.getUint32(offset + 12) !== 1) return undefined; bitDepth = body[8]; colorType = body[9] }
    if (kind === 'IDAT') data.push(body)
    offset += 12 + length
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6) || data.length === 0) return undefined
  const joined = new Uint8Array(data.reduce((sum, part) => sum + part.length, 0))
  data.reduce((at, part) => (joined.set(part, at), at + part.length), 0)
  const raw = inflate(joined)
  if (raw.length < 4) return undefined
  return '#' + [raw[1], raw[2], raw[3]].map(value => value.toString(16).padStart(2, '0')).join('')
}

/** The frame's background behind a whole picture: each edge's colour on its own half. */
export function edgeBlock(edges?: PictureEdges): string | undefined {
  if (!edges) return undefined
  const [a, b] = edges.colors
  return a === b ? a : `linear-gradient(${edges.side === 'tb' ? 'to bottom' : 'to right'}, ${a} 50%, ${b} 50%)`
}
