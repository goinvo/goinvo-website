import type { PortableTextBlock } from '@portabletext/types'
import type { SectionBackground } from '@/lib/sectionBackgrounds'

export interface SanityImage {
  _type: 'image'
  asset: {
    _ref: string
    _type: 'reference'
  }
  hotspot?: {
    x: number
    y: number
    height: number
    width: number
  }
  alt?: string
  caption?: string
  accessibilityDescription?: string
  decorative?: boolean
  link?: string
  mobileImageUrl?: string
}

export interface Category {
  _id: string
  title: string
  slug: { current: string }
  isMainCategory?: boolean
  filterOrder?: number
  description?: string
}

export interface CaseStudy {
  _id: string
  _type?: 'caseStudy'
  _draftId?: string
  title: string
  heading?: string
  slug: { current: string }
  client?: string | null
  hideClientSubtitle?: boolean
  hideAuthors?: boolean
  image?: SanityImage
  caption?: string
  categories?: Category[]
  displayTags?: string
  metadataLayout?: 'stacked' | 'inline'
  authors?: TeamMember[] | null
  time?: string
  content?: PortableTextBlock[]
  upNext?: (CaseStudy | ExternalUpNextItem)[]
  hidden?: boolean
  metaDescription?: string
}

export interface ExternalUpNextItem {
  _id: string
  _type: 'externalUpNextItem'
  title: string
  url: string
  caption?: string
  image?: SanityImage
}

export interface Result {
  stat: string
  unit?: string
  annotation?: string
  description: string
  refNumber?: string
  refTarget?: string
}

export interface Reference {
  title: string
  link?: string
}

export interface TeamMember {
  _id: string
  name: string
  role: string
  bio?: PortableTextBlock[]
  image?: SanityImage
  social?: {
    linkedin?: string
    twitter?: string
    medium?: string
    website?: string
    email?: string
  }
  isAlumni?: boolean
}

export interface Feature {
  _id: string
  _type?: 'feature'
  _draftId?: string
  title: string
  cardTitle?: string
  slug: { current: string }
  image?: SanityImage
  heroPosition?: string
  fullImageCover?: boolean
  articleHeroImage?: SanityImage
  articleHeroPosition?: string
  articleFullImageCover?: boolean
  contentWidth?: 'narrow' | 'medium' | 'wide'
  bulletStyle?: 'star' | 'disc'
  video?: string
  description?: string
  categories?: string[]
  date?: string
  showPageMeta?: boolean
  client?: string | null
  featured?: boolean
  authorLayout?: string
  authorBackground?: SectionBackground
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authors?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contributors?: any[]
  contributorsLayout?: string
  contributorsBackground?: SectionBackground
  newsletterBackground?: SectionBackground
  peopleSectionPosition?: 'beforeNewsletter' | 'afterNewsletter'
  specialThanksHeading?: string
  specialThanksHeadingStyle?: 'subheading' | 'legacy-centered-h2'
  specialThanks?: PortableTextBlock[]
  showAboutGoInvo?: boolean
  aboutGoInvoPosition?: 'beforeNewsletter' | 'afterNewsletter'
  aboutGoInvoVariant?: 'default' | 'practice'
  externalLink?: string
  hiddenWorkPage?: boolean
  content?: PortableTextBlock[]
  metaTitle?: string
  metaDescription?: string
}

export interface Job {
  _id: string
  title: string
  description?: PortableTextBlock[]
  location?: string
  type?: string
  isActive?: boolean
}

/** Display shape consumed by VisionGrid, DraftFeaturesSection, and the
 *  spotlight card. Produced by src/lib/featureDisplay.ts from a Sanity
 *  Feature document; originally sourced from src/data/features.json. */
export interface StaticFeature {
  id: string
  title: string
  date: string
  client: string
  categories: string[]
  caption?: string
  image: string
  video?: string
  link: string
  externalLink?: boolean
  hiddenWorkPage?: boolean
  featured?: boolean
  imagePosition?: string
}

export interface SEO {
  title?: string
  description?: string
  image?: SanityImage
}

export interface HealthVisualization {
  _id: string
  title: string
  slug: { current: string }
  image?: SanityImage
  caption?: string
  date?: string
  downloadLink?: string
  learnMoreLink?: string
  order?: number
}
