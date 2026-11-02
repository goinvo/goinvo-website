import type { SanityImage } from '@/types'

export interface FocusRegion { x: number; y: number; width: number; height: number }
export interface WalkthroughScene {
  _key: string
  title: string
  navigationTitle?: string
  description: string
  image: SanityImage
  focus?: FocusRegion
  focusLabel?: string
  tryPrompt?: string
  demoUrl?: string
}
export interface GuidedWalkthroughValue {
  _key?: string
  _type: 'guidedWalkthrough'
  title: string
  variant?: 'chapters' | 'preview'
  scenes: WalkthroughScene[]
  demoUrl?: string
  demoLabel?: string
  notice?: string
  overviewVideo?: {
    animation?: 'capture' | 'answerMorph'
    durationSeconds?: number
    url: string
    mobileUrl?: string
    poster?: string
    mobilePoster?: string
    description?: string
    transcript?: string
    beats?: {
      _key: string
      title: string
      caption: string
      image: SanityImage
      focus: FocusRegion
    }[]
  }
}

export function imageDimensions(image: SanityImage): { width: number; height: number } {
  const match = image?.asset?._ref?.match(/-(\d+)x(\d+)-/)
  return match ? { width: Number(match[1]), height: Number(match[2]) } : { width: 1440, height: 960 }
}

export function validFocus(value: unknown): value is FocusRegion {
  if (!value || typeof value !== 'object') return false
  const { x, y, width, height } = value as FocusRegion
  return [x, y, width, height].every(Number.isFinite) && x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= 100.01 && y + height <= 100.01
}

/** A padded crop in source-image percentages; all calculations use the actual image ratio. */
export function focusCrop(focus: FocusRegion | undefined, image: { width: number; height: number }): FocusRegion {
  if (!validFocus(focus)) return { x: 0, y: 0, width: 100, height: 100 }
  let width = Math.min(100, focus.width + 12)
  let height = Math.min(100, focus.height + 12)
  const ratio = 4 / 3
  if ((width * image.width) / (height * image.height) > ratio) height = width * image.width / (ratio * image.height)
  else width = height * image.height * ratio / image.width
  width = Math.min(100, width)
  height = Math.min(100, height)
  return { x: Math.max(0, Math.min(100 - width, focus.x + focus.width / 2 - width / 2)), y: Math.max(0, Math.min(100 - height, focus.y + focus.height / 2 - height / 2)), width, height }
}

/** Only web destinations may be used for an iframe or a public action. */
export function walkthroughUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  const url = value.trim()
  if (url.startsWith('/') && !url.startsWith('//')) return url
  try { return ['https:', 'http:'].includes(new URL(url).protocol) ? url : undefined } catch { return undefined }
}
