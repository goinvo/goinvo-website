import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/config'
import { client } from '@/sanity/lib/client'
import { allCaseStudiesQuery, visionProjectsQuery } from '@/sanity/lib/queries'
import type { CaseStudy, VisionProject } from '@/types'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url

  // Static routes
  const staticRoutes = [
    '',
    '/work',
    '/services',
    '/contact',
    '/about',
    '/about/careers',
    '/about/open-office-hours',
    '/vision',
    '/enterprise',
    '/government',
    '/ai',
    '/patient-engagement',
    '/open-source-health-design',
    '/why-hire-healthcare-design-studio',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }))

  // Dynamic case study routes
  let caseStudyRoutes: MetadataRoute.Sitemap = []
  let visionRoutes: MetadataRoute.Sitemap = []

  try {
    const caseStudies = await client.fetch<CaseStudy[]>(allCaseStudiesQuery)
    caseStudyRoutes = caseStudies.map((study) => ({
      url: `${baseUrl}/work/${study.slug.current}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

    const visionProjects = await client.fetch<VisionProject[]>(visionProjectsQuery)
    visionRoutes = visionProjects.map((project) => ({
      url: `${baseUrl}/vision/${project.slug.current}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))
  } catch {
    // Sanity not configured — skip dynamic routes
  }

  return [...staticRoutes, ...caseStudyRoutes, ...visionRoutes]
}
