import createImageUrlBuilder from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'
import { dataset, projectId } from '../env'

const imageBuilder = createImageUrlBuilder({ projectId: projectId || 'placeholder', dataset })

export function urlForImage(source: SanityImageSource) {
  return imageBuilder.image(source)
}
