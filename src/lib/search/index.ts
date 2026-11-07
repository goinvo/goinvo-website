import { groq } from 'next-sanity'
import { client } from '@/sanity/lib/client'
import { urlForImage } from '@/sanity/lib/image'
import { headingAnchorId } from '@/lib/headingAnchor'
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
  /** Curated retrieval vocabulary (see PROJECT_KEYWORDS) — searched, never displayed. */
  keywords?: string[]
  /** In-page section anchors (id = the heading's rendered `id`), for deep links
   * that auto-scroll to the relevant content. Only ids that really exist on the
   * page are listed — the AI may link to these and nothing else. */
  sections?: SectionAnchor[]
}

export interface SectionAnchor {
  id: string
  title: string
}

/** Heading styles the PortableText renderer stamps with an `id` — keep in sync
 * with PortableTextRenderer's block map (anchor formula: headingAnchorId). */
const ANCHORED_STYLES = [
  'h2',
  'h2Large',
  'h2LargeCentered',
  'h2LargeCenteredSpacious',
  'h2HealthcareMethodology',
  'h2Center',
  'sectionTitle',
  'h3',
  'legacyH1Centered',
  'legacyH1CenteredWide',
]

const MAX_SECTIONS_PER_ITEM = 12

export function normalizeSections(raw: { text?: string | null }[] | null | undefined): SectionAnchor[] {
  const seen = new Set<string>()
  const sections: SectionAnchor[] = []
  for (const block of raw ?? []) {
    const title = (block.text ?? '').replace(/\s+/g, ' ').trim()
    if (!title || title.length > 90) continue
    const id = headingAnchorId(title)
    if (!id || seen.has(id)) continue
    seen.add(id)
    sections.push({ id, title })
    if (sections.length >= MAX_SECTIONS_PER_ITEM) break
  }
  return sections
}

/** Validate an AI-chosen anchor against the item's real section list. */
export function resolveAnchor(
  item: SearchIndexItem,
  anchor: string | undefined | null,
): SectionAnchor | null {
  if (!anchor) return null
  return item.sections?.find((s) => s.id === anchor) ?? null
}

/**
 * Per-project retrieval vocabulary for terms buyers type that captions don't
 * contain. Every entry here traces to a persona-study recall miss (e.g. a
 * state HHS director's "Medicaid eligibility and enrollment" never found
 * eligibility-engine; a med-device HFE director's queries never found the
 * FDA-cleared InfoBionic work). Keys are Sanity slugs; unknown keys are
 * harmless. Keep values honest — these words make a project FINDABLE, and the
 * grounding guard treats them as sourced facts a blurb may then repeat.
 */
export const PROJECT_KEYWORDS: Record<string, string[]> = {
  'eligibility-engine': ['eligibility', 'enrollment', 'medicaid', 'integrated eligibility', 'benefits administration', 'case management', 'public assistance'],
  'mass-snap': ['snap', 'benefits application', 'public assistance', 'food assistance', 'eligibility', 'state government'],
  'public-sector': ['government', 'state government', 'civic', 'public services'],
  'infobionic-heart-monitoring': ['medical device', 'fda', 'fda-cleared', 'class ii', '510(k)', 'remote monitoring', 'cardiac', 'arrhythmia', 'regulated device'],
  'tabeeb-diagnostics': ['medical device', 'point of care', 'diagnostics', 'telemedicine', 'rural'],
  'open-pro': ['epro', 'pro', 'patient-reported outcomes', 'open source', 'clinical research'],
  'determinants-of-health': ['sdoh', 'social determinants', 'open source', 'poster'],
  '3m-coderyte': ['revenue cycle', 'medical coding', 'claims', 'nlp', 'natural language processing'],
  'prior-auth': ['prior authorization', 'utilization review', 'payer', 'insurance'],
  'partners-insight': ['irb', 'research administration', 'clinical research', 'compliance workflow'],
  'mount-sinai-consent': ['consent', 'e-consent', 'clinical research', 'genomics'],
  'all-of-us': ['clinical research', 'research participants', 'nih', 'longitudinal study'],
  'ahrq-cds': ['cds', 'clinical decision support', 'standards of care'],
  'mitre-flux-notes': ['ehr', 'clinical documentation', 'point of care', 'structured data'],
  'mitre-shr': ['health records', 'interoperability', 'data standards'],
  'hgraph': ['data visualization', 'open source', 'health metrics'],
  'ipsos-facto': ['ai platform', 'research intelligence', 'enterprise ai'],
  'open-source-healthcare': ['open source', 'journal', 'licensing'],
  'inspired-ehrs': ['ehr', 'electronic health records', 'open source'],
}

interface RawCaseStudy {
  slug: string
  title: string
  heading?: string
  client?: string
  caption?: string
  image?: SanityImage
  categories?: (string | null)[]
  sectionBlocks?: { text?: string | null }[]
}

interface RawFeature {
  slug: string
  title: string
  description?: string
  image?: SanityImage
  externalLink?: string
  categories?: (string | null)[]
  sectionBlocks?: { text?: string | null }[]
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
    "categories": categories[]->title,
    "sectionBlocks": content[_type == "block" && style in ${JSON.stringify(ANCHORED_STYLES)}]{ "text": pt::text(@) }
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
    categories,
    "sectionBlocks": content[_type == "block" && style in ${JSON.stringify(ANCHORED_STYLES)}]{ "text": pt::text(@) }
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
      keywords: PROJECT_KEYWORDS[cs.slug],
      sections: normalizeSections(cs.sectionBlocks),
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
      keywords: PROJECT_KEYWORDS[f.slug],
      // External features scroll nowhere we control — no anchors for those.
      sections: f.externalLink ? [] : normalizeSections(f.sectionBlocks),
    }))

  const items = [...caseStudies, ...features]
  if (items.length > 0) cache = { at: Date.now(), items }
  return items
}
