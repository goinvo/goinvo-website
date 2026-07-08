import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/config'
import { client } from '@/sanity/lib/client'
import { allCaseStudiesQuery, allFeaturesQuery } from '@/sanity/lib/queries'
import type { CaseStudy, Feature } from '@/types'

// Pinned build-time date for static routes. Bump when static-route content
// changes; using `new Date()` here would mark every URL as just-modified on
// every regeneration, which dilutes the lastmod signal.
const STATIC_ROUTES_LAST_MODIFIED = new Date('2026-05-04T00:00:00Z')

// Sanity documents return _updatedAt as an ISO string.
type DatedDoc = { _updatedAt?: string; slug: { current: string } }

function lastModFromDoc(doc: DatedDoc): Date {
  return doc._updatedAt ? new Date(doc._updatedAt) : STATIC_ROUTES_LAST_MODIFIED
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url

  // Static routes. /thank-you is intentionally omitted — it's a
  // post-form-submission confirmation page that should not be indexed.
  // It also carries a `noindex` meta and a Disallow rule in robots.txt.
  const staticRoutes = [
    '',
    '/work',
    '/services',
    '/services/design-diagnostic',
    '/contact',
    '/about',
    '/about/careers',
    '/about/open-office-hours',
    '/about/studio-timeline',
    '/vision',
    '/enterprise',
    '/government',
    '/ai',
    '/patient-engagement',
    '/open-source-health-design',
    '/why-hire-healthcare-design-studio',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: STATIC_ROUTES_LAST_MODIFIED,
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }))

  // Dynamic case study routes
  let caseStudyRoutes: MetadataRoute.Sitemap = []
  let visionRoutes: MetadataRoute.Sitemap = []

  try {
    const caseStudies = await client.fetch<(CaseStudy & DatedDoc)[]>(
      allCaseStudiesQuery,
    )
    caseStudyRoutes = caseStudies.map((study) => ({
      url: `${baseUrl}/work/${study.slug.current}`,
      lastModified: lastModFromDoc(study),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

    const features = await client.fetch<(Feature & DatedDoc)[]>(allFeaturesQuery)
    visionRoutes = features
      .filter((feature) => feature.slug?.current && !feature.externalLink)
      .map((feature) => ({
        url: `${baseUrl}/vision/${feature.slug.current}`,
        lastModified: lastModFromDoc(feature),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }))
  } catch {
    // Sanity not configured — skip dynamic routes
  }

  return [...staticRoutes, ...caseStudyRoutes, ...visionRoutes]
}
