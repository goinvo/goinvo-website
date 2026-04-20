import { urlForImage } from '@/sanity/lib/image'
import type { Feature, StaticFeature } from '@/types'

/**
 * Convert a Sanity `feature` document into the display shape used by
 * VisionGrid, spotlight cards, and DraftFeaturesSection. Lets the
 * rendering code stay agnostic to the Sanity image/asset refs.
 */
export function featureToDisplay(feature: Feature): StaticFeature {
  const slug = feature.slug?.current ?? feature._id

  const isExternal = Boolean(feature.externalLink)
  const link = isExternal ? (feature.externalLink as string) : `/vision/${slug}`

  let imageUrl = ''
  if (feature.image) {
    try {
      imageUrl = urlForImage(feature.image).width(1600).fit('max').url()
    } catch {
      imageUrl = ''
    }
  }
  if (!imageUrl && feature.video) {
    imageUrl = feature.video
  }

  return {
    id: slug,
    title: feature.title,
    date: feature.date ?? '',
    client: feature.client ?? '',
    categories: feature.categories ?? [],
    caption: feature.description,
    image: imageUrl,
    video: feature.video,
    link,
    externalLink: isExternal,
    hiddenWorkPage: feature.hiddenWorkPage,
    imagePosition: feature.heroPosition,
  }
}
