import type { Metadata } from 'next'
import Image from 'next/image'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'
import { siteConfig } from '@/lib/config'
import { createClient } from '@sanity/client'
import { apiVersion, dataset, previewToken, projectId } from '@/sanity/env'
import { datasetForType } from '@/lib/marketing/datasetRouting'
import { urlForImageWithFallback } from '@/sanity/lib/image'

type LinkInBioItem = {
  _id: string
  title?: string
  description?: string
  url: string
  type?: string
  featured?: boolean
  image?: SanityImageSource
  sourceChannel?: string
}

/**
 * Link items are a marketing type, so this page needs a TOKENED client.
 *
 * sanityFetch cannot serve it: @sanity/next-loader only sends the server token
 * when the perspective is not "published", so a public page read is always
 * anonymous. That is why this page is broken today — the items have dotted ids,
 * which Sanity's public-dataset grant hides from an anonymous reader, so the
 * page renders "No links are currently published" while two active links exist.
 */
const linkItemsClient = projectId
  ? createClient({
      projectId,
      dataset: datasetForType('marketingLinkItem', dataset),
      apiVersion,
      token: previewToken,
      useCdn: false,
      perspective: 'published',
    })
  : null

const linkInBioItemsQuery = `
  *[
    _type == "marketingLinkItem"
    && status == "active"
    && defined(url)
    && url != ""
    && (!defined(expiresAt) || dateTime(expiresAt) > dateTime(now()))
    && (!defined(publishAt) || dateTime(publishAt) <= dateTime(now()))
  ] | order(coalesce(order, 100) asc, _updatedAt desc) {
    _id,
    title,
    description,
    url,
    type,
    featured,
    image,
    sourceChannel
  }
`

export const revalidate = 60

export const metadata: Metadata = {
  title: 'GoInvo Links',
  description: 'Recent GoInvo links, projects, articles, and social references.',
  alternates: {
    canonical: '/links',
  },
  openGraph: {
    title: 'GoInvo Links',
    description: 'Recent GoInvo links, projects, articles, and social references.',
    url: `${siteConfig.url}/links`,
  },
}

export default async function LinksPage() {
  const links = linkItemsClient
    ? await linkItemsClient
        .fetch<LinkInBioItem[]>(linkInBioItemsQuery, {}, { next: { revalidate: 60 } })
        .catch(() => [] as LinkInBioItem[])
    : []

  return (
    <main className="min-h-screen bg-[#f7faf9] text-black">
      <section className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col px-5 py-8 sm:px-6">
        <header className="mb-6">
          <a href={siteConfig.url} aria-label="Go to GoInvo home" className="mb-5 inline-flex no-underline">
            <Image
              src="/images/goinvo-logo.svg"
              alt="GoInvo"
              width={102}
              height={52}
              priority
              className="h-auto w-[86px]"
            />
          </a>
          <div className="border-l-4 border-secondary pl-4">
            <h1 className="font-serif text-[2rem] leading-none text-black sm:text-[2.4rem]">Links</h1>
            <p className="mt-3 mb-0 text-sm leading-6 text-gray">
              Recent articles, projects, and resources from the GoInvo studio.
            </p>
          </div>
        </header>

        <div className="grid gap-3">
          {links.map((link) => (
            <LinkCard key={link._id} link={link} />
          ))}
          {links.length === 0 ? (
            <p className="m-0 text-sm leading-6 text-gray">No links are currently published.</p>
          ) : null}
        </div>

        <div className="mt-auto pt-8 text-center text-xs text-gray">
          <a href={siteConfig.url} className="font-semibold text-secondary no-underline hover:text-primary">
            goinvo.com
          </a>
        </div>
      </section>
    </main>
  )
}

function LinkCard({ link }: { link: LinkInBioItem }) {
  const imageUrl = link.image
    ? urlForImageWithFallback(link.image, (builder) => builder.width(160).height(160).fit('crop'))
    : ''

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noreferrer"
      className={[
        'group grid grid-cols-[auto_1fr] items-center gap-3 border border-gray-medium bg-white p-3 text-black no-underline transition',
        'hover:border-secondary hover:text-black hover:shadow-[0_10px_28px_rgba(0,115,133,0.13)]',
        link.featured ? 'min-h-[92px] border-secondary' : 'min-h-[78px]',
      ].join(' ')}
      style={{ borderRadius: 8 }}
    >
      <span
        className={[
          'flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden bg-tertiary-lightest font-sans text-sm font-bold text-secondary',
          link.featured ? 'h-16 w-16' : '',
        ].join(' ')}
        style={{ borderRadius: 8 }}
      >
        {imageUrl ? (
          <Image src={imageUrl} alt="" width={80} height={80} className="h-full w-full object-cover" />
        ) : (
          link.title?.slice(0, 2).toUpperCase() || 'GI'
        )}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <strong className="block truncate font-sans text-[0.95rem] leading-5 font-bold">{link.title || 'GoInvo link'}</strong>
          {link.sourceChannel ? (
            <span className="shrink-0 bg-[#fdf8e8] px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-primary uppercase">
              {link.sourceChannel}
            </span>
          ) : null}
        </span>
        {link.description ? (
          <span className="mt-1 block text-xs leading-5 text-gray">{link.description}</span>
        ) : null}
      </span>
    </a>
  )
}
