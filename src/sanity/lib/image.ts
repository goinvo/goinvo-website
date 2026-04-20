import createImageUrlBuilder from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'
import { dataset, projectId } from '../env'

const imageBuilder = createImageUrlBuilder({ projectId: projectId || 'placeholder', dataset })

export function urlForImage(source: SanityImageSource) {
  return imageBuilder.image(source)
}

/** Fallback shown whenever a hero/listing image isn't set. */
export const PLACEHOLDER_IMAGE_URL = '/images/placeholder-image.svg'

/**
 * Return a safe image URL for any Sanity image source. If the source is
 * missing or the asset can't be resolved, returns the placeholder so the
 * UI renders something instead of a broken <img>.
 */
export function urlForImageWithFallback(
  source: SanityImageSource | null | undefined,
  transform?: (builder: ReturnType<typeof urlForImage>) => ReturnType<typeof urlForImage>,
): string {
  if (!source) return PLACEHOLDER_IMAGE_URL
  try {
    const builder = urlForImage(source)
    return (transform ? transform(builder) : builder).url()
  } catch {
    return PLACEHOLDER_IMAGE_URL
  }
}
