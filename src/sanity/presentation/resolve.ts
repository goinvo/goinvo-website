import { defineDocuments, defineLocations } from 'sanity/presentation'

function articleLocations({
  title,
  slug,
  articleHref,
  indexTitle,
  indexHref,
  missingMessage,
}: {
  title?: string
  slug?: string
  articleHref: (slug: string) => string
  indexTitle: string
  indexHref: string
  missingMessage: string
}) {
  if (!slug) {
    return {
      message: missingMessage,
      tone: 'caution' as const,
    }
  }

  return {
    locations: [
      { title: title || 'Untitled', href: articleHref(slug) },
      { title: indexTitle, href: indexHref },
    ],
  }
}

export const mainDocuments = defineDocuments([
  {
    route: '/work/:slug',
    filter: `_type == "caseStudy" && slug.current == $slug`,
  },
  {
    route: '/vision/:slug',
    filter: `_type == "feature" && slug.current == $slug`,
  },
])

export const locations = {
  caseStudy: defineLocations({
    select: {
      title: 'title',
      slug: 'slug.current',
    },
    resolve: (document) =>
      articleLocations({
        title: document?.title,
        slug: document?.slug,
        articleHref: (slug) => `/work/${slug}`,
        indexTitle: 'Work',
        indexHref: '/work',
        missingMessage: 'Add a slug before this case study can be previewed.',
      }),
  }),
  feature: defineLocations({
    select: {
      title: 'title',
      slug: 'slug.current',
    },
    resolve: (document) =>
      articleLocations({
        title: document?.title,
        slug: document?.slug,
        articleHref: (slug) => `/vision/${slug}`,
        indexTitle: 'Vision',
        indexHref: '/vision',
        missingMessage: 'Add a slug before this vision article can be previewed.',
      }),
  }),
}
