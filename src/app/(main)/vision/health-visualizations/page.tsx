import type { Metadata } from 'next'
import Link from 'next/link'
import { sanityFetch } from '@/sanity/lib/live'
import { allHealthVisualizationsQuery } from '@/sanity/lib/queries'
import { fetchStorefrontCatalog } from '@/lib/shop/catalog'
import { urlForImage } from '@/sanity/lib/image'
import { cloudfrontImage } from '@/lib/utils'
import {
  SHOP_SHIPPING_PRICE_CENTS,
  isProductOrderable,
  shopPriceCentsFor,
} from '@/lib/shop/checkout'
import { SubscribeForm } from '@/components/forms/SubscribeForm'
import { PosterChatCta } from '@/components/chat/PosterChatCta'
import {
  VisualizationStorefront,
  type VisualizationPrint,
} from '@/components/vision/VisualizationStorefront'
import type { HealthVisualization } from '@/types'

export const metadata: Metadata = {
  alternates: { canonical: '/vision/health-visualizations' },
  title: 'Health Visualizations, Design Axioms, and Health Cards',
  description:
    'Download GoInvo health visualizations under an open-source license or order them as physical prints.',
  openGraph: {
    title: 'GoInvo Health and Design Collection',
    description:
      'Download the open-source files or order physical prints of GoInvo health visualizations, Design Axioms, and Health Cards.',
    images: ['/images/features/posters/health-visualizations-hero-2.jpg'],
  },
}

const DEFAULT_PRINT_CURRENCY = 'USD'

// No headline price on this page by design (Shirley, 2026-08-11): prices are
// CMS-owned and per piece, so any single number in the hero would be both
// incomplete and one edit away from being wrong. Each card states its own.

function formatUsd(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

// Prices are editable in the Studio, so the page must not be baked at build.
// Next only accepts a literal here, not an imported constant (it reads this
// statically and fails the build with "Invalid segment configuration export"),
// so this must stay in step with SHOP_CATALOG_REVALIDATE_SECONDS. A test pins
// the two together.
export const revalidate = 60

// Normalized card data shared by both Sanity and fallback paths
interface PosterCard {
  id: string
  slug: string
  title: string
  caption?: string
  date?: string
  imageUrl: string
  downloadUrl: string
  learnMoreLink: string
  license?: string
  licenseUrl?: string
}

type StorefrontSettings = {
  storeName?: string
  supportEmail?: string
}

type MarketingProduct = {
  slug?: string
  price?: number
  currency?: string
  checkoutUrl?: string
  status?: string
  orderable?: boolean
  production?: 'print-on-demand' | 'from-stock'
  trackInventory?: boolean
  inventoryQuantity?: number
  allowBackorder?: boolean
}

type StorefrontData = {
  settings: StorefrontSettings | null
  products: MarketingProduct[]
}

// Fallback data from the old Gatsby site
const fallbackPosters = [
  {
    id: 'own-your-health-data',
    title: 'Own Your Health Data',
    image: '/images/features/own-your-health-data/patient-data-ownership.jpg',
    downloadLink: '/pdf/vision/own-your-health-data/OwnYourHealthData.pdf',
    learnMoreLink: '/vision/own-your-health-data/',
  },
  {
    id: 'how-to-vote-early',
    title: 'How To Vote Early',
    image: '/images/features/posters/how-to-vote-early.jpg',
    downloadLink: '/pdf/vision/posters/how-to-vote-early.pdf',
    learnMoreLink: '',
  },
  {
    id: 'precision-autism',
    title: 'Precision Autism',
    image: '/images/features/precision-autism/precision-autism.jpg',
    downloadLink: '/pdf/vision/precision-autism/Precision-Autism-25.Aug.2020.pdf',
    learnMoreLink: '/vision/precision-autism/',
  },
  {
    id: 'test-treat-trace',
    title: 'Test. Treat. Trace.',
    image: '/images/features/test-treat-trace/test-treat-trace-2.jpg',
    downloadLink: '/pdf/vision/test-treat-trace/Test-Treat-Trace-18Jun2020.pdf',
    learnMoreLink: '/vision/test-treat-trace/',
  },
  {
    id: 'washhands',
    title: 'Wash Your Hands',
    image: '/images/features/coronavirus/wash-hands.jpg',
    downloadLink: '/pdf/vision/posters/understandingcoronavirus_wash-hands-poster.pdf',
    learnMoreLink: '/vision/coronavirus/',
  },
  {
    id: 'vapepocolypse',
    title: 'Vapepocolypse',
    image: '/images/features/vapepocolypse/vapepocolypse-hero.jpg',
    downloadLink: '/pdf/vision/vapepocolypse/Vapepocolypse.pdf',
    learnMoreLink: '/vision/vapepocolypse/',
  },
  {
    id: 'who-uses-my-health-data',
    title: 'Who Uses My Health Data?',
    image: '/images/features/health-data-use/health-data-use-hero-2.jpg',
    downloadLink: '/pdf/vision/health-data-use/health-data-use-poster-medium.pdf',
    learnMoreLink: '/vision/who-uses-my-health-data/',
  },
  {
    id: 'health-payment-system-complexity',
    title: 'Health Payment System Complexity',
    image: '/images/features/posters/health-payment-system-complexity-hero.jpg',
    downloadLink: '/pdf/vision/posters/health-payment-system-complexity.pdf',
    learnMoreLink: '',
  },
  {
    id: 'insuring-price-increase',
    title: 'Insuring Price Increase',
    image: '/images/features/posters/insuring-price-increase-hero.jpg',
    downloadLink: '/pdf/vision/posters/insuring-price-increase.pdf',
    learnMoreLink: '',
  },
  {
    id: 'healthcare-dollars',
    title: 'Where Your Health Dollars Go',
    image: '/images/features/healthcare-dollars/healthcare-dollars-hero.jpg',
    downloadLink: '/pdf/vision/healthcare-dollars/healthcare-dollars-visualization.pdf',
    learnMoreLink: '/vision/healthcare-dollars/',
  },
  {
    id: 'determinants-of-health-spanish',
    title: 'Determinantes de la Salud',
    image: '/images/features/posters/determinantes_de_la_salud.jpg',
    downloadLink: '/pdf/vision/posters/determinantes_de_la_salud_42x50.pdf',
    learnMoreLink: '/vision/determinants-of-health/',
  },
  {
    id: 'determinants-of-health',
    title: 'Determinants of Health',
    image: '/images/features/determinants-of-health/determinants-of-health-poster.jpg',
    downloadLink: '/pdf/vision/posters/health-determinants.pdf',
    learnMoreLink: '/vision/determinants-of-health/',
  },
  {
    id: 'open-healthcare-systems',
    title: 'Open Healthcare Systems Model',
    image: '/images/features/posters/precision-prism-architecture-diagram.jpg',
    downloadLink: '/pdf/vision/posters/precision-prism-architecture-diagram.pdf',
    learnMoreLink: '',
  },
  {
    id: 'virtual-care-encounters',
    title: 'Virtual Care Encounters',
    image: '/images/features/posters/virtual-care-encounters.jpg',
    downloadLink: '/pdf/vision/posters/virtual-care-encounters.pdf',
    learnMoreLink: '/vision/virtual-care/',
  },
  {
    id: 'open-source-healthcare',
    title: 'Open Source Healthcare Journal',
    image: '/images/features/posters/oshc-book.jpg',
    downloadLink: '/pdf/vision/open-source-healthcare/open-source-healthcare-journal.pdf',
    learnMoreLink: '/vision/open-source-healthcare/',
  },
  {
    id: 'hie-data-access',
    title: 'HIE Data Access Workflow',
    image: '/images/features/posters/hie-data-access-workflow.jpg',
    downloadLink: '/pdf/vision/posters/hie-data-access-workflow.pdf',
    learnMoreLink: '',
  },
  {
    id: 'sources-of-clinical-data',
    title: 'Sources of Clinical Health Data',
    image: '/images/features/posters/sources-of-clinical-health-data-2.jpg',
    downloadLink: '/pdf/vision/posters/sources-of-clinical-health-data.pdf',
    learnMoreLink: '/work/fastercures-health-data-basics',
  },
  {
    id: 'sources-of-data',
    title: 'Sources of Your Personal Health Data',
    image: '/images/features/posters/sources-of-data.jpg',
    downloadLink: '/pdf/vision/posters/sources-of-data.pdf',
    learnMoreLink: '/work/fastercures-health-data-basics',
  },
  {
    id: 'sdoh-spend',
    title: 'Spending within the Determinants of Health',
    image: '/images/features/determinants-of-health/sdoh-spend-mockup.jpg',
    downloadLink: '/pdf/vision/posters/sdoh-spend-v12.pdf',
    learnMoreLink: '/vision/determinants-of-health/#determinants-spending',
  },
  {
    id: 'critical-mass',
    title: 'Critical MASS',
    image: '/images/features/posters/critical-mass.jpg',
    downloadLink: '/pdf/vision/posters/critical-mass.pdf',
    learnMoreLink: '',
  },
  {
    id: 'ebola',
    title: 'Ebola Care Guideline',
    image: '/images/features/posters/ebola-care-guideline.jpg',
    downloadLink: '/pdf/vision/posters/ebola-care-guideline.pdf',
    learnMoreLink: '/vision/ebola-care-guideline/',
  },
  {
    id: 'data-interop',
    title: 'Standardized Data for Interoperability',
    image: '/images/features/posters/standard-health-data.jpg',
    downloadLink: '/pdf/vision/posters/standard-health-data.pdf',
    learnMoreLink: 'https://yes.goinvo.com/articles/a-path-towards-standardized-health',
  },
  {
    id: 'healthcare-is-a-human-right',
    title: 'Healthcare is a Human Right',
    image: '/images/features/posters/care-card-healthcare-is-a-human-right.jpg',
    downloadLink: '/pdf/vision/posters/care-card-healthcare-is-a-human-right.pdf',
    learnMoreLink: 'http://carecards.me/#healthcare-human-right',
  },
  {
    id: 'examine-yourself',
    title: 'Examine Yourself',
    image: '/images/features/posters/care-card-examine-yourself-2.jpg',
    downloadLink: '/pdf/vision/posters/care-card-examine-yourself.pdf',
    learnMoreLink: 'http://carecards.me/#examine-yourself',
  },
  {
    id: 'sugar-kills',
    title: 'Sugar Kills',
    image: '/images/features/posters/care-card-sugar-kills.jpg',
    downloadLink: '/pdf/vision/posters/care-card-sugar-kills-2.pdf',
    learnMoreLink: 'http://carecards.me/#sugar-kills',
  },
  {
    id: 'make-things',
    title: 'Make Things',
    image: '/images/features/posters/design-axiom-make-things.jpg',
    downloadLink: '/pdf/vision/posters/design-axiom-make-things.pdf',
    learnMoreLink: 'http://www.designaxioms.com/',
  },
  {
    id: 'let-data-scream',
    title: 'Let Data Scream',
    image: '/images/features/posters/design-axiom-let-data-scream.jpg',
    downloadLink: '/pdf/vision/posters/design-axiom-let-data-scream.pdf',
    learnMoreLink: 'http://www.designaxioms.com/',
  },
  {
    id: 'prototype-like-crazy',
    title: 'Prototype Like Crazy',
    image: '/images/features/posters/design-axiom-prototype-like-crazy.jpg',
    downloadLink: '/pdf/vision/posters/design-axiom-prototype-like-crazy-2.pdf',
    learnMoreLink: 'http://www.designaxioms.com/',
  },
  {
    id: 'care-plans-process',
    title: 'Care Planning Process',
    image: '/images/features/posters/careplans-process.jpg',
    downloadLink: '/pdf/vision/posters/careplans-process.pdf',
    learnMoreLink: '/vision/care-plans/',
  },
  {
    id: 'shr-medical-encounter',
    title: 'SHR Medical Encounter Journey Map',
    image: '/images/features/posters/shr-medical-encounter-journey-map.jpg',
    downloadLink: '/pdf/vision/posters/shr-medical-encounter-journey-map.pdf',
    learnMoreLink: '/work/mitre-shr',
  },
  {
    id: 'care-plans-ecosystem',
    title: 'Care Plans Ecosystem',
    image: '/images/features/posters/careplans-ecosystem.jpg',
    downloadLink: '/pdf/vision/posters/careplans-ecosystem.pdf',
    learnMoreLink: '/vision/care-plans/',
  },
]

// Slug-to-CloudFront-image lookup so Sanity items without uploaded images still render
const slugToImage: Record<string, string> = Object.fromEntries(
  fallbackPosters.map((p) => [p.id, p.image]),
)

const learnMorePathOverrides: Record<string, string> = {
  '/features/careplans': '/vision/care-plans/',
  '/vision/careplans': '/vision/care-plans/',
}

function resolveDownloadUrl(link: string): string {
  if (!link) return ''
  const goinvoPdf = link.match(/^https?:\/\/(?:www\.)?goinvo\.com(\/pdf\/.+)$/)
  if (goinvoPdf) return cloudfrontImage(goinvoPdf[1])
  return link.startsWith('http') ? link : cloudfrontImage(link)
}

/** Rewrite legacy GoInvo URLs to current local routes. */
function normalizeLearnMoreLink(link: string): string {
  if (!link) return ''
  const trimmed = link.trim()
  const goinvoPath = trimmed.match(/^https?:\/\/(?:www\.)?goinvo\.com(\/[^?#]*)([?#].*)?$/)
  const localLink = goinvoPath ? `${goinvoPath[1]}${goinvoPath[2] ?? ''}` : trimmed
  const [path, hash] = localLink.split('#')
  const normalizedPath = path.replace(/\/$/, '')
  const override = learnMorePathOverrides[normalizedPath]
  if (override) return hash ? `${override}#${hash}` : override

  // Convert legacy /features/ URLs to local /vision/ paths
  const m = localLink.match(/^\/features\/([^/?#]+)/)
  if (m) return `/vision/${m[1]}`
  return trimmed
}

function normalizeSanityItems(items: HealthVisualization[]): PosterCard[] {
  return items.map((viz) => {
    const slug = viz.slug?.current ?? ''
    const sanityImageUrl = viz.image ? urlForImage(viz.image).width(600).height(450).url() : null
    const fallbackImageUrl = slugToImage[slug] ? cloudfrontImage(slugToImage[slug]) : ''

    return {
      id: viz._id,
      slug,
      title: viz.title,
      caption: viz.caption ?? '',
      date: viz.date,
      imageUrl: sanityImageUrl || fallbackImageUrl,
      downloadUrl: resolveDownloadUrl(viz.downloadLink ?? ''),
      learnMoreLink: normalizeLearnMoreLink(viz.learnMoreLink ?? ''),
      license: viz.license,
      licenseUrl: viz.licenseUrl,
    }
  })
}

function normalizeFallbackItems(): PosterCard[] {
  return fallbackPosters.map((p) => ({
    id: p.id,
    slug: p.id,
    title: p.title,
    imageUrl: cloudfrontImage(p.image),
    downloadUrl: resolveDownloadUrl(p.downloadLink),
    learnMoreLink: normalizeLearnMoreLink(p.learnMoreLink),
  }))
}

export default async function HealthVisualizationsPage() {
  // Products come through the shop's own reader, not the public query: the
  // marketingProduct documents are not anonymously readable, so a public fetch
  // silently returns nothing and every price falls back to code while checkout
  // charges what the CMS says. Same reader, same credentials, same numbers.
  const [{ data: sanityVizItems }, storefrontData] = (await Promise.all([
    sanityFetch({ query: allHealthVisualizationsQuery }),
    fetchStorefrontCatalog(),
  ])) as [{ data: HealthVisualization[] }, StorefrontData | null]

  const cards =
    sanityVizItems && sanityVizItems.length > 0
      ? normalizeSanityItems(sanityVizItems)
      : normalizeFallbackItems()
  const productBySlug = new Map(
    (storefrontData?.products || [])
      .filter((product) => product.slug)
      .map((product) => [product.slug!, product]),
  )
  const visualizations: VisualizationPrint[] = cards.map((card) => {
    const product = productBySlug.get(card.slug)

    return {
      _id: card.id,
      slug: card.slug,
      title: card.title,
      caption: card.caption,
      date: card.date,
      downloadLink: card.downloadUrl,
      learnMoreLink: card.learnMoreLink,
      imageUrl: card.imageUrl,
      price: product?.price ?? shopPriceCentsFor(card.slug) / 100,
      currency: product?.currency || DEFAULT_PRINT_CURRENCY,
      checkoutUrl: product?.checkoutUrl,
      // Production and availability come from the piece's own document, so an
      // editor can take something off sale or say a book ships from stock
      // without a deploy, and so the card and the structured data below can
      // never disagree about it.
      production: product?.production || 'print-on-demand',
      orderable: isProductOrderable(product),
      license: card.license,
      licenseUrl: card.licenseUrl,
    }
  })
  const supportEmail = storefrontData?.settings?.supportEmail || 'hello@goinvo.com'
  const storeName = storefrontData?.settings?.storeName || 'GoInvo Health and Design Collection'
  // Jon's picks for the hero spray (2026-08-07): a set whose orientations sit
  // well together, shown as full posters below.
  const HERO_SLUGS = ['make-things', 'precision-autism', 'own-your-health-data']
  const heroPrints = HERO_SLUGS.map((slug) =>
    visualizations.find((visualization) => visualization.slug === slug && visualization.imageUrl),
  ).filter((print): print is VisualizationPrint => Boolean(print))
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: storeName,
    itemListElement: visualizations.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: item.title,
        description: item.caption,
        image: item.imageUrl,
        url: 'https://www.goinvo.com/vision/health-visualizations',
        offers: {
          '@type': 'Offer',
          price: item.price,
          priceCurrency: item.currency,
          // Must agree with the card. The Open Source Healthcare Journal shows
          // "Print currently unavailable" on the page while this told Google it
          // was in stock, which is the kind of contradiction that earns a
          // manual action and, worse, a buyer expecting to order it.
          availability:
            item.orderable === false
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
          // Shipping is a real, non-zero cost and the US is the only
          // destination — search results that omit either mislead the buyer
          // before they ever reach checkout.
          shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingRate: {
              '@type': 'MonetaryAmount',
              value: SHOP_SHIPPING_PRICE_CENTS / 100,
              currency: item.currency,
            },
            shippingDestination: {
              '@type': 'DefinedRegion',
              addressCountry: 'US',
            },
          },
        },
      },
    })),
  }

  return (
    <div id="shop-top" className="bg-[#f5f3ef] text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replaceAll('<', '\\u003c'),
        }}
      />

      <section className="relative overflow-hidden bg-[#11141f] text-white pt-[calc(var(--spacing-header-height)+4rem)] pb-16 lg:pt-[calc(var(--spacing-header-height)+6rem)] lg:pb-20">
        <div className="absolute inset-0 opacity-70 bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px),radial-gradient(circle_at_78%_28%,rgba(227,98,22,.75)_0_4%,transparent_18%),radial-gradient(circle_at_67%_45%,rgba(77,196,214,.38),transparent_32%),linear-gradient(135deg,transparent_35%,rgba(0,115,133,.56))] bg-[size:34px_34px,34px_34px,auto,auto,auto]" />
        <div className="absolute -left-20 top-1/2 h-52 w-52 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full border border-[#79d9e5]/20" />
        <div className="relative max-width content-padding grid lg:grid-cols-[minmax(0,1fr)_420px] gap-12 lg:items-center">
          <div>
            <h1 className="font-serif font-light text-[2.65rem] leading-[1.03] sm:text-[3.5rem] lg:text-[4.6rem] lg:leading-[.98] max-w-[760px] mb-7">
              Health ideas, made visible.
            </h1>
            {/* Two offers, two lines with air between them, one CTA — browsing
                and downloading are the same trip (Juhan's feedback, 2026-08-07). */}
            <p className="font-sans text-lg leading-relaxed text-[#d9dee7] max-w-[650px] mb-4">
              Download the open-source files and make them your own.
            </p>
            <p className="font-sans text-lg leading-relaxed text-[#d9dee7] max-w-[650px] mb-8">
              Want a finished piece? Buy a poster and we&apos;ll ship it to you.
            </p>
            <div className="flex flex-wrap gap-3 mb-7">
              <a
                href="#catalog"
                className="bg-primary text-white no-underline font-semibold px-6 py-3 hover:bg-primary-dark transition-colors"
              >
                Browse the collection
              </a>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#d9dee7]">
              <span>
                ✓ Every design is a free PDF under a{' '}
                <Link
                  href="https://creativecommons.org/licenses/by/3.0/us/"
                  target="_blank"
                  rel="noreferrer"
                  data-shop-license-link
                  className="text-[#79d9e5] underline underline-offset-2"
                >
                  public license
                </Link>
              </span>
              <span>
                ✓ Prints are priced per piece. {formatUsd(SHOP_SHIPPING_PRICE_CENTS / 100)} flat US
                shipping, however many you order
              </span>
            </div>
          </div>

          {heroPrints.length > 0 && (
            <div className="relative hidden lg:block h-[430px]" aria-hidden="true">
              {heroPrints.map((print, index) => (
                <div
                  key={print._id}
                  className={`absolute w-[245px] bg-[#f7f3ea] p-3 shadow-[0_26px_65px_rgba(0,0,0,.42)] border border-white/20 ${
                    index === 0
                      ? 'left-0 top-14 -rotate-6'
                      : index === 1
                        ? 'right-0 top-0 rotate-6'
                        : 'right-16 bottom-0 -rotate-2'
                  }`}
                >
                  {/* Full poster at its natural aspect — no square letterbox, so
                      a landscape print doesn't sit in awkward white space
                      (Jon's feedback, 2026-08-07). */}
                  <div className="bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={print.imageUrl!} alt="" className="block h-auto w-full" />
                  </div>
                  <p className="font-serif text-[#11141f] text-lg leading-tight mt-3 mb-0 truncate">
                    {print.title}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* The old three-column "how it works" band is gone: its facts (free
          PDFs + license, printed on demand, browse) now live as one quiet line
          in the hero — the labels had too much priority, especially on mobile
          (Juhan's feedback, 2026-08-07). */}
      <VisualizationStorefront items={visualizations} supportEmail={supportEmail} />

      <section className="bg-gray-light py-8">
        <div className="max-width max-width-md content-padding mx-auto">
          <SubscribeForm />
        </div>
      </section>

      <section className="bg-[#24434d] text-white">
        <div className="max-width content-padding py-12 lg:py-16 flex flex-col lg:flex-row justify-between gap-7 lg:items-center">
          <h2 className="font-serif font-light text-[2rem] lg:text-[2.5rem] leading-tight mb-0">
            Want a different size, a set for an event, a rush order, or shipping outside the US?
            Tell us what you need.
          </h2>
          <PosterChatCta />
        </div>
      </section>
    </div>
  )
}
