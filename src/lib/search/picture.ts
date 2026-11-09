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

/** How to ask Sanity for a picture's edge colours: the image (inside the editor's crop)
 * shrunk to one pixel across its depth, 50 along it, so the first and last pixels are its
 * two edges, each the average of a 2% band. (Sampling a thin rect=… strip instead failed
 * near the bottom of some JPEGs, "bad extract area", and read the wrong colour on others.) */
export function edgeSampleQuery(width: number, height: number, crop: { top?: number; bottom?: number; left?: number; right?: number } | undefined, frameAspect: number): { side: PictureEdges['side']; query: string } | undefined {
  const left = Math.round(width * (crop?.left ?? 0)), top = Math.round(height * (crop?.top ?? 0))
  const w = Math.round(width * (1 - (crop?.left ?? 0) - (crop?.right ?? 0))), h = Math.round(height * (1 - (crop?.top ?? 0) - (crop?.bottom ?? 0)))
  if (w < 1 || h < 1) return undefined
  const rect = w === width && h === height ? '' : `rect=${left},${top},${w},${h}&`
  return w / h >= frameAspect
    ? { side: 'tb', query: `${rect}w=1&h=50&fit=scale&fm=png` }
    : { side: 'lr', query: `${rect}w=50&h=1&fit=scale&fm=png` }
}

/** The first and last pixels of a small 8-bit truecolour PNG (with or without alpha), as
 * #rrggbb. Undoes the five PNG row filters; the caller passes zlib's inflate, so this file
 * stays free of Node imports. */
export function pngEndColors(png: Uint8Array, inflate: (data: Uint8Array) => Uint8Array): [string, string] | undefined {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  let offset = 8, width = 0, height = 0, colorType = -1, bitDepth = 0
  const data: Uint8Array[] = []
  while (offset + 8 <= png.length) {
    const length = view.getUint32(offset), kind = String.fromCharCode(...png.subarray(offset + 4, offset + 8)), body = png.subarray(offset + 8, offset + 8 + length)
    if (kind === 'IHDR') { width = view.getUint32(offset + 8); height = view.getUint32(offset + 12); bitDepth = body[8]; colorType = body[9] }
    if (kind === 'IDAT') data.push(body)
    offset += 12 + length
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6) || data.length === 0 || width * height < 1 || width * height > 4096) return undefined
  const joined = new Uint8Array(data.reduce((sum, part) => sum + part.length, 0))
  data.reduce((at, part) => (joined.set(part, at), at + part.length), 0)
  const raw = inflate(joined), bpp = colorType === 6 ? 4 : 3, stride = width * bpp
  if (raw.length < height * (stride + 1)) return undefined
  const pixels = new Uint8Array(height * stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? pixels[y * stride + x - bpp] : 0, b = y ? pixels[(y - 1) * stride + x] : 0, c = x >= bpp && y ? pixels[(y - 1) * stride + x - bpp] : 0
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
      const predicted = filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : filter === 4 ? (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) : 0
      pixels[y * stride + x] = (raw[y * (stride + 1) + 1 + x] + predicted) & 255
    }
  }
  const hex = (at: number) => '#' + [0, 1, 2].map(k => pixels[at + k].toString(16).padStart(2, '0')).join('')
  return [hex(0), hex((width * height - 1) * bpp)]
}

/** The frame's background behind a whole picture: each edge's colour on its own half. */
export function edgeBlock(edges?: PictureEdges): string | undefined {
  if (!edges) return undefined
  const [a, b] = edges.colors
  return a === b ? a : `linear-gradient(${edges.side === 'tb' ? 'to bottom' : 'to right'}, ${a} 50%, ${b} 50%)`
}
