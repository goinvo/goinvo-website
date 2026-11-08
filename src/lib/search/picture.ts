/**
 * A result's picture, by its real shape. The project images are mostly wide banners
 * (from square to over 4:1, around 2:1 typical), and some are lettering, so a fixed crop
 * cuts words in half ("THE PATIE…"). Each result carries its image's shape and the
 * editor's focal point, and the card decides per picture: fill the frame when the crop
 * would be small, otherwise show the whole image.
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

/** The most of either side a picture may lose to fill its frame. Generous on purpose: the
 * cards fill their frames as the site's own cards do, and only a picture that would lose
 * a big share of itself (wide lettering, like the Pay the Patient banner) shows whole. */
export const MAX_PICTURE_CROP = 0.4

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
