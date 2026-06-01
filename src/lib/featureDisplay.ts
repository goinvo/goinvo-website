import { urlForImage, PLACEHOLDER_IMAGE_URL } from '@/sanity/lib/image'
import type { Feature, StaticFeature } from '@/types'

const FEATURE_LINK_OVERRIDES: Record<string, string> = {
  'studio-timeline': '/about/studio-timeline',
}

const FEATURE_CARD_TITLE_OVERRIDES: Record<string, string> = {
  'virtual-diabetes-care': 'Virtual Diabetes Care',
}

/**
 * Convert a Sanity `feature` document into the display shape used by
 * VisionGrid, spotlight cards, and DraftFeaturesSection. Lets the
 * rendering code stay agnostic to the Sanity image/asset refs.
 */
export function featureToDisplay(feature: Feature): StaticFeature {
  const slug = feature.slug?.current ?? feature._id

  const isExternal = Boolean(feature.externalLink)
  const link = isExternal
    ? (feature.externalLink as string)
    : FEATURE_LINK_OVERRIDES[slug] ?? `/vision/${slug}`

  let imageUrl = ''
  if (feature.image) {
    try {
      imageUrl = urlForImage(feature.image).width(1600).fit('max').url()
    } catch {
      imageUrl = ''
    }
  }

  // Card crop focus: prefer the heroPosition dropdown, then fall back to the
  // image hotspot (crosshair) so an editor's crop selection is reflected on
  // listing cards. Leave undefined when neither is set (VisionGrid defaults it).
  const hotspot = feature.image?.hotspot
  const imagePosition =
    feature.heroPosition?.trim() ||
    (hotspot ? `${(hotspot.x * 100).toFixed(2)}% ${(hotspot.y * 100).toFixed(2)}%` : undefined)
  if (!imageUrl && feature.video) {
    imageUrl = feature.video
  }
  if (!imageUrl) {
    imageUrl = PLACEHOLDER_IMAGE_URL
  }

  return {
    id: slug,
    title: feature.cardTitle || FEATURE_CARD_TITLE_OVERRIDES[slug] || feature.title,
    date: feature.date ?? '',
    client: feature.client ?? '',
    categories: feature.categories ?? [],
    caption: feature.description,
    image: imageUrl,
    video: feature.video,
    link,
    externalLink: isExternal,
    hiddenWorkPage: feature.hiddenWorkPage,
    featured: feature.featured,
    imagePosition,
  }
}
