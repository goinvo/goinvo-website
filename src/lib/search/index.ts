import { groq } from 'next-sanity'
import { client } from '@/sanity/lib/client'
import { urlForImage } from '@/sanity/lib/image'
import type { SanityImage } from '@/types'

/**
 * Project index for the AI search band: every publicly listed case study and
 * vision piece, flattened to the fields the lexical recall + Claude selection
 * stages need. Built from Sanity and cached per serverless instance.
 */
export interface SearchIndexItem {
  slug: string
  href: string
  title: string
  caption: string
  client?: string
  categories: string[]
  image?: string
  kind: 'work' | 'vision'
}

interface RawCaseStudy {
  slug: string
  title: string
  heading?: string
  client?: string
  caption?: string
  image?: SanityImage
  categories?: (string | null)[]
}

interface RawFeature {
  slug: string
  title: string
  description?: string
  image?: SanityImage
  externalLink?: string
  categories?: (string | null)[]
}

const searchIndexQuery = groq`{
  "caseStudies": *[_type == "caseStudy"
    && hidden != true
    && title != "Untitled"
    && !(slug.current match "untitled-*")
  ] | order(orderRank asc) {
    "slug": slug.current,
    title,
    heading,
    client,
    caption,
    image,
    "categories": categories[]->title
  },
  "features": *[_type == "feature"
    && title != "Untitled"
    && !(slug.current match "untitled-*")
  ] | order(orderRank asc) {
    "slug": slug.current,
    "title": coalesce(cardTitle, title),
    description,
    image,
    externalLink,
    categories
  }
}`

function imageUrl(image?: SanityImage): string | undefined {
  if (!image) return undefined
  try {
    return urlForImage(image).width(640).height(480).url()
  } catch {
    return undefined
  }
}

function cleanCategories(categories?: (string | null)[]): string[] {
  return (categories ?? []).filter((c): c is string => typeof c === 'string' && c.length > 0)
}

const CACHE_TTL_MS = 10 * 60 * 1000
let cache: { at: number; items: SearchIndexItem[] } | null = null

export async function getSearchIndex(): Promise<SearchIndexItem[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.items

  const data = (await client.fetch(searchIndexQuery)) as {
    caseStudies: RawCaseStudy[]
    features: RawFeature[]
  }

  const caseStudies: SearchIndexItem[] = (data.caseStudies ?? [])
    .filter((cs) => cs.slug && cs.title)
    .map((cs) => ({
      slug: cs.slug,
      href: `/work/${cs.slug}`,
      title: cs.title,
      caption: cs.caption ?? cs.heading ?? '',
      client: cs.client,
      categories: cleanCategories(cs.categories),
      image: imageUrl(cs.image),
      kind: 'work' as const,
    }))

  const seen = new Set(caseStudies.map((c) => c.slug))
  const features: SearchIndexItem[] = (data.features ?? [])
    .filter((f) => f.slug && f.title && !seen.has(f.slug))
    .map((f) => ({
      slug: f.slug,
      href: f.externalLink || `/vision/${f.slug}`,
      title: f.title,
      caption: f.description ?? '',
      categories: cleanCategories(f.categories),
      image: imageUrl(f.image),
      kind: 'vision' as const,
    }))

  const items = [...caseStudies, ...features]
  if (items.length > 0) cache = { at: Date.now(), items }
  return items
}
