import type { PortableTextBlock } from '@portabletext/types'

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
}

export interface Category {
  _id: string
  title: string
  slug: { current: string }
  description?: string
}

export interface CaseStudy {
  _id: string
  title: string
  heading?: string
  slug: { current: string }
  client?: string
  image?: SanityImage
  caption?: string
  categories?: Category[]
  authors?: TeamMember[]
  time?: string
  content?: PortableTextBlock[]
  upNext?: CaseStudy[]
  hidden?: boolean
  metaDescription?: string
  order?: number
}

export interface Result {
  stat: string
  description: string
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
  order?: number
}

export interface Feature {
  _id: string
  title: string
  slug: { current: string }
  image?: SanityImage
  fullImageCover?: boolean
  video?: string
  description?: string
  categories?: string[]
  date?: string
  client?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authors?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contributors?: any[]
  externalLink?: string
  hiddenWorkPage?: boolean
  content?: PortableTextBlock[]
  metaDescription?: string
  order?: number
}

export interface Job {
  _id: string
  title: string
  description?: PortableTextBlock[]
  location?: string
  type?: string
  isActive?: boolean
}

export interface VisionProject {
  _id: string
  title: string
  slug: { current: string }
  image?: SanityImage
  description?: PortableTextBlock[]
  content?: PortableTextBlock[]
  category?: string
}

/** Static feature from features.json (Gatsby-sourced data) */
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
  imagePosition?: string
}

export interface HomepageHeader {
  _id: string
  title: string
  subtitle?: string
  image?: SanityImage
  link?: string
  order?: number
}

export interface SiteSettings {
  siteTitle: string
  description?: string
  socialLinks?: {
    linkedin?: string
    twitter?: string
    medium?: string
    flickr?: string
    soundcloud?: string
  }
  footerText?: string
  contactInfo?: {
    email?: string
    phone?: string
    address?: string
  }
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
