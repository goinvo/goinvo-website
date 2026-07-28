import type { Metadata } from 'next'
import Image from 'next/image'
import { sanityFetch } from '@/sanity/lib/live'
import { allHealthVisualizationsQuery } from '@/sanity/lib/queries'
import { urlForImage } from '@/sanity/lib/image'
import { cloudfrontImage, cn } from '@/lib/utils'
import { Reveal } from '@/components/ui/Reveal'
import { SubscribeForm } from '@/components/forms/SubscribeForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import type { HealthVisualization } from '@/types'
import './health-visualizations.css'

export const metadata: Metadata = {
  alternates: { canonical: '/vision/health-visualizations' },
  title: 'Open Source Healthcare Visualizations',
  description:
    'A repo of open source health visualizations and graphics available to all for use or modification, under a Creative Commons Attribution v3 license or MIT license.',
}

// Normalized card data shared by both Sanity and fallback paths
interface PosterCard {
  id: string
  slug: string
  title: string
  caption?: string
  date?: string
  category?: string
  imageUrl: string
  downloadUrl: string
  learnMoreLink: string
}

// Fallback data from the old Gatsby site
const fallbackPosters = [
  { id: 'own-your-health-data', title: 'Own Your Health Data', image: '/images/features/own-your-health-data/patient-data-ownership.jpg', downloadLink: '/pdf/vision/own-your-health-data/OwnYourHealthData.pdf', learnMoreLink: '/vision/own-your-health-data/' },
  { id: 'how-to-vote-early', title: 'How To Vote Early', image: '/images/features/posters/how-to-vote-early.jpg', downloadLink: '/pdf/vision/posters/how-to-vote-early.pdf', learnMoreLink: '' },
  { id: 'precision-autism', title: 'Precision Autism', image: '/images/features/precision-autism/precision-autism.jpg', downloadLink: '/pdf/vision/precision-autism/Precision-Autism-25.Aug.2020.pdf', learnMoreLink: '/vision/precision-autism/' },
  { id: 'test-treat-trace', title: 'Test. Treat. Trace.', image: '/images/features/test-treat-trace/test-treat-trace-2.jpg', downloadLink: '/pdf/vision/test-treat-trace/Test-Treat-Trace-18Jun2020.pdf', learnMoreLink: '/vision/test-treat-trace/' },
  { id: 'washhands', title: 'Wash Your Hands', image: '/images/features/coronavirus/wash-hands.jpg', downloadLink: '/pdf/vision/posters/understandingcoronavirus_wash-hands-poster.pdf', learnMoreLink: '/vision/coronavirus/' },
  { id: 'vapepocolypse', title: 'Vapepocolypse', image: '/images/features/vapepocolypse/vapepocolypse-hero.jpg', downloadLink: '/pdf/vision/vapepocolypse/Vapepocolypse.pdf', learnMoreLink: '/vision/vapepocolypse/' },
  { id: 'who-uses-my-health-data', title: 'Who Uses My Health Data?', image: '/images/features/health-data-use/health-data-use-hero-2.jpg', downloadLink: '/pdf/vision/health-data-use/health-data-use-poster-medium.pdf', learnMoreLink: '/vision/who-uses-my-health-data/' },
  { id: 'health-payment-system-complexity', title: 'Health Payment System Complexity', image: '/images/features/posters/health-payment-system-complexity-hero.jpg', downloadLink: '/pdf/vision/posters/health-payment-system-complexity.pdf', learnMoreLink: '' },
  { id: 'insuring-price-increase', title: 'Insuring Price Increase', image: '/images/features/posters/insuring-price-increase-hero.jpg', downloadLink: '/pdf/vision/posters/insuring-price-increase.pdf', learnMoreLink: '' },
  { id: 'healthcare-dollars', title: 'Where Your Health Dollars Go', image: '/images/features/healthcare-dollars/healthcare-dollars-hero.jpg', downloadLink: '/pdf/vision/healthcare-dollars/healthcare-dollars-visualization.pdf', learnMoreLink: '/vision/healthcare-dollars/' },
  { id: 'determinants-of-health-spanish', title: 'Determinantes de la Salud', image: '/images/features/posters/determinantes_de_la_salud.jpg', downloadLink: '/pdf/vision/posters/determinantes_de_la_salud_42x50.pdf', learnMoreLink: '/vision/determinants-of-health/' },
  { id: 'determinants-of-health', title: 'Determinants of Health', image: '/images/features/determinants-of-health/determinants-of-health-poster.jpg', downloadLink: '/pdf/vision/posters/health-determinants.pdf', learnMoreLink: '/vision/determinants-of-health/' },
  { id: 'open-healthcare-systems', title: 'Open Healthcare Systems Model', image: '/images/features/posters/precision-prism-architecture-diagram.jpg', downloadLink: '/pdf/vision/posters/precision-prism-architecture-diagram.pdf', learnMoreLink: '' },
  { id: 'virtual-care-encounters', title: 'Virtual Care Encounters', image: '/images/features/posters/virtual-care-encounters.jpg', downloadLink: '/pdf/vision/posters/virtual-care-encounters.pdf', learnMoreLink: '/vision/virtual-care/' },
  { id: 'open-source-healthcare', title: 'Open Source Healthcare Journal', image: '/images/features/posters/oshc-book.jpg', downloadLink: '/pdf/vision/open-source-healthcare/open-source-healthcare-journal.pdf', learnMoreLink: '/vision/open-source-healthcare/' },
  { id: 'hie-data-access', title: 'HIE Data Access Workflow', image: '/images/features/posters/hie-data-access-workflow.jpg', downloadLink: '/pdf/vision/posters/hie-data-access-workflow.pdf', learnMoreLink: '' },
  { id: 'sources-of-clinical-data', title: 'Sources of Clinical Health Data', image: '/images/features/posters/sources-of-clinical-health-data-2.jpg', downloadLink: '/pdf/vision/posters/sources-of-clinical-health-data.pdf', learnMoreLink: '/work/fastercures-health-data-basics' },
  { id: 'sources-of-data', title: 'Sources of Your Personal Health Data', image: '/images/features/posters/sources-of-data.jpg', downloadLink: '/pdf/vision/posters/sources-of-data.pdf', learnMoreLink: '/work/fastercures-health-data-basics' },
  { id: 'sdoh-spend', title: 'Spending within the Determinants of Health', image: '/images/features/determinants-of-health/sdoh-spend-mockup.jpg', downloadLink: '/pdf/vision/posters/sdoh-spend-v12.pdf', learnMoreLink: '/vision/determinants-of-health/#determinants-spending' },
  { id: 'critical-mass', title: 'Critical MASS', image: '/images/features/posters/critical-mass.jpg', downloadLink: '/pdf/vision/posters/critical-mass.pdf', learnMoreLink: '' },
  { id: 'ebola', title: 'Ebola Care Guideline', image: '/images/features/posters/ebola-care-guideline.jpg', downloadLink: '/pdf/vision/posters/ebola-care-guideline.pdf', learnMoreLink: '/vision/ebola-care-guideline/' },
  { id: 'data-interop', title: 'Standardized Data for Interoperability', image: '/images/features/posters/standard-health-data.jpg', downloadLink: '/pdf/vision/posters/standard-health-data.pdf', learnMoreLink: 'https://yes.goinvo.com/articles/a-path-towards-standardized-health' },
  { id: 'healthcare-is-a-human-right', title: 'Healthcare is a Human Right', image: '/images/features/posters/care-card-healthcare-is-a-human-right.jpg', downloadLink: '/pdf/vision/posters/care-card-healthcare-is-a-human-right.pdf', learnMoreLink: 'http://carecards.me/#healthcare-human-right' },
  { id: 'examine-yourself', title: 'Examine Yourself', image: '/images/features/posters/care-card-examine-yourself-2.jpg', downloadLink: '/pdf/vision/posters/care-card-examine-yourself.pdf', learnMoreLink: 'http://carecards.me/#examine-yourself' },
  { id: 'sugar-kills', title: 'Sugar Kills', image: '/images/features/posters/care-card-sugar-kills.jpg', downloadLink: '/pdf/vision/posters/care-card-sugar-kills-2.pdf', learnMoreLink: 'http://carecards.me/#sugar-kills' },
  { id: 'make-things', title: 'Make Things', image: '/images/features/posters/design-axiom-make-things.jpg', downloadLink: '/pdf/vision/posters/design-axiom-make-things.pdf', learnMoreLink: 'http://designaxioms.com/' },
  { id: 'let-data-scream', title: 'Let Data Scream', image: '/images/features/posters/design-axiom-let-data-scream.jpg', downloadLink: '/pdf/vision/posters/design-axiom-let-data-scream.pdf', learnMoreLink: 'http://designaxioms.com/' },
  { id: 'prototype-like-crazy', title: 'Prototype Like Crazy', image: '/images/features/posters/design-axiom-prototype-like-crazy.jpg', downloadLink: '/pdf/vision/posters/design-axiom-prototype-like-crazy-2.pdf', learnMoreLink: 'http://designaxioms.com/' },
  { id: 'care-plans-process', title: 'Care Planning Process', image: '/images/features/posters/careplans-process.jpg', downloadLink: '/pdf/vision/posters/careplans-process.pdf', learnMoreLink: '/vision/care-plans/' },
  { id: 'shr-medical-encounter', title: 'SHR Medical Encounter Journey Map', image: '/images/features/posters/shr-medical-encounter-journey-map.jpg', downloadLink: '/pdf/vision/posters/shr-medical-encounter-journey-map.pdf', learnMoreLink: '/work/mitre-shr' },
  { id: 'care-plans-ecosystem', title: 'Care Plans Ecosystem', image: '/images/features/posters/careplans-ecosystem.jpg', downloadLink: '/pdf/vision/posters/careplans-ecosystem.pdf', learnMoreLink: '/vision/care-plans/' },
]

/* ------------------------------------------------------------------ */
/*  Collections: themed sections of the poster catalog                 */
/*                                                                     */
/*  A poster lands in a collection by (1) its explicit `category` set  */
/*  in Sanity, else (2) this slug map. Anything unmatched renders in   */
/*  the trailing "From the archive" section, so new Sanity posters     */
/*  always show up even before they're categorized.                    */
/* ------------------------------------------------------------------ */

interface Collection {
  key: string
  title: string
  sub: string
  blurb: string
  /** Curated display order; the first slug is the section spotlight. */
  slugs: string[]
  dark?: boolean
}

const COLLECTIONS: Collection[] = [
  {
    key: 'health-data',
    title: 'Your health data',
    sub: 'Who holds it, where it flows, and who profits.',
    blurb:
      'Your medical record is scattered across more places than you think. These graphics trace personal health data through the system — and make the case that you should own it.',
    slugs: ['own-your-health-data', 'who-uses-my-health-data', 'sources-of-data', 'sources-of-clinical-data', 'hie-data-access', 'shr-medical-encounter', 'data-interop'],
  },
  {
    key: 'cost-of-care',
    title: 'The cost of care',
    sub: 'Following the dollars through the machine.',
    blurb:
      'US healthcare is the most expensive on earth, and the receipts are nearly unreadable. These visualizations untangle where the money actually goes.',
    slugs: ['healthcare-dollars', 'health-payment-system-complexity', 'insuring-price-increase', 'critical-mass'],
  },
  {
    key: 'determinants',
    title: 'Determinants of health',
    sub: 'Only 11% of your health is medical care.',
    blurb:
      'Genetics, behavior, environment, and social circumstances shape the rest. Our most-cited series maps the whole picture of what makes us healthy — and where the spending doesn’t follow it.',
    slugs: ['determinants-of-health', 'sdoh-spend', 'determinants-of-health-spanish'],
  },
  {
    key: 'public-health',
    title: 'Public health, in public',
    sub: 'Guidance you can tape to a wall.',
    blurb:
      'Epidemics, outbreaks, and civic action, distilled to a single printable sheet — made to be shared in moments when clarity was in short supply.',
    slugs: ['test-treat-trace', 'washhands', 'ebola', 'vapepocolypse', 'precision-autism', 'how-to-vote-early'],
  },
  {
    key: 'care-delivery',
    title: 'How care gets delivered',
    sub: 'The journeys behind the medicine.',
    blurb:
      'Care plans, virtual visits, and clinical encounters, mapped end to end — the invisible choreography between patients, clinicians, and systems.',
    slugs: ['care-plans-ecosystem', 'care-plans-process', 'virtual-care-encounters', 'open-healthcare-systems'],
  },
  {
    key: 'studio-craft',
    title: 'Axioms & care cards',
    sub: 'The reminders we design by.',
    blurb:
      'Studio wisdom in poster form: design axioms from twenty years of practice, and care cards for living well. Print them, hang them, live them.',
    slugs: ['open-source-healthcare', 'make-things', 'let-data-scream', 'prototype-like-crazy', 'healthcare-is-a-human-right', 'examine-yourself', 'sugar-kills'],
    dark: true,
  },
]

const ARCHIVE_COLLECTION: Collection = {
  key: 'archive',
  title: 'From the archive',
  sub: 'New and uncategorized additions.',
  blurb: 'Fresh from the studio — posters that haven’t been sorted into a collection yet.',
  slugs: [],
}

const slugToCollection: Record<string, string> = Object.fromEntries(
  COLLECTIONS.flatMap((c) => c.slugs.map((slug) => [slug, c.key]))
)

/** Group cards into collections, preserving each collection's curated order. */
function groupIntoCollections(cards: PosterCard[]) {
  const byKey = new Map<string, PosterCard[]>()
  for (const card of cards) {
    const key = card.category ?? slugToCollection[card.slug] ?? 'archive'
    const bucket = byKey.get(key) ?? []
    bucket.push(card)
    byKey.set(key, bucket)
  }
  const sections = COLLECTIONS.map((collection) => {
    const bucket = byKey.get(collection.key) ?? []
    const order = new Map(collection.slugs.map((slug, i) => [slug, i]))
    bucket.sort((a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99))
    return { collection, cards: bucket }
  }).filter((s) => s.cards.length > 0)
  const archive = byKey.get('archive') ?? []
  if (archive.length > 0) sections.push({ collection: ARCHIVE_COLLECTION, cards: archive })
  return sections
}

// Slug-to-CloudFront-image lookup so Sanity items without uploaded images still render
const slugToImage: Record<string, string> = Object.fromEntries(
  fallbackPosters.map((p) => [p.id, p.image])
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
  const goinvoPath = trimmed.match(
    /^https?:\/\/(?:www\.)?goinvo\.com(\/[^?#]*)([?#].*)?$/
  )
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
    const sanityImageUrl = viz.image
      ? urlForImage(viz.image).width(1200).height(900).url()
      : null
    const fallbackImageUrl = slugToImage[slug]
      ? cloudfrontImage(slugToImage[slug])
      : ''

    return {
      id: viz._id,
      slug,
      title: viz.title,
      caption: viz.caption ?? '',
      date: viz.date ?? '',
      category: viz.category || undefined,
      imageUrl: sanityImageUrl || fallbackImageUrl,
      downloadUrl: resolveDownloadUrl(viz.downloadLink ?? ''),
      learnMoreLink: normalizeLearnMoreLink(viz.learnMoreLink ?? ''),
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
  const { data: sanityVizItems } = (await sanityFetch({
    query: allHealthVisualizationsQuery,
  })) as { data: HealthVisualization[] }

  const cards =
    sanityVizItems && sanityVizItems.length > 0
      ? normalizeSanityItems(sanityVizItems)
      : normalizeFallbackItems()

  const sections = groupIntoCollections(cards)

  const stats = [
    { v: String(cards.length), cap: 'open-licensed posters and graphics, and counting' },
    { v: '15+', cap: 'years of visual advocacy for patients' },
    { v: '2', cap: 'open licenses — Creative Commons & MIT' },
    { v: '$0', cap: 'to download, print, remix, and share' },
  ]

  return (
    <div className="hv-root">
      <SetCaseStudyHero image={cloudfrontImage('/images/features/posters/health-visualizations-hero-2.jpg')} />

      {/* ─── Title + stats ─────────────────────────────────── */}
      <section className="hv-band" style={{ paddingBottom: 72 }}>
        <div className="hv-band-inner">
          <Reveal style="slide-up">
            <div className="hv-eyebrow accent" style={{ marginBottom: 16 }}>
              Open source · Free forever
            </div>
            <h1 className="hv-display" style={{ maxWidth: '18ch' }}>Health Visualizations</h1>
            <div className="hv-sub-italic" style={{ marginTop: 10 }}>
              Complex health systems, made visible.
            </div>
          </Reveal>
          <Reveal style="slide-up" delay={0.1}>
            <p className="hv-body-lg" style={{ marginTop: 28, maxWidth: '62ch' }}>
              Every infographic here is open source — yours to use, print, and modify under a{' '}
              <a
                href="https://creativecommons.org/licenses/by/3.0/us/"
                target="_blank"
                rel="noopener noreferrer"
                className="hv-link"
              >
                Creative Commons Attribution v3
              </a>{' '}
              license, or for the SHR Journey Map and HIE diagram, an{' '}
              <a
                href="https://opensource.org/licenses/MIT"
                target="_blank"
                rel="noopener noreferrer"
                className="hv-link"
              >
                MIT
              </a>{' '}
              license.
            </p>
          </Reveal>
          <div
            className="hv-stats"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, marginTop: 56 }}
          >
            {stats.map((s, i) => (
              <Reveal key={s.cap} style="slide-up" delay={0.08 * i}>
                <div className="hv-stat">
                  <div className="hv-stat-number">{s.v}</div>
                  <div className="hv-stat-label">{s.cap}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Collection index ──────────────────────────────── */}
      <section className="hv-band warm" style={{ paddingTop: 64, paddingBottom: 64 }}>
        <div className="hv-band-inner">
          <Reveal style="slide-up">
            <div className="hv-eyebrow accent" style={{ marginBottom: 12 }}>The collections</div>
            <h2 className="hv-h2" style={{ marginBottom: 36 }}>Browse by theme.</h2>
          </Reveal>
          <Reveal style="slide-up" delay={0.08}>
            <nav className="hv-index" aria-label="Poster collections">
              {sections.map(({ collection, cards: sectionCards }, i) => (
                <a key={collection.key} href={`#${collection.key}`} className="hv-index-link">
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="name">{collection.title}</span>
                  <span className="count">{sectionCards.length} posters</span>
                  <span className="arr">↓</span>
                </a>
              ))}
            </nav>
          </Reveal>
        </div>
      </section>

      {/* ─── Collections ───────────────────────────────────── */}
      {sections.map(({ collection, cards: sectionCards }, i) => {
        const [spotlight, ...rest] = sectionCards
        const band = collection.dark ? 'ink' : i % 2 === 1 ? 'warm' : ''
        return (
          <section key={collection.key} id={collection.key} className={cn('hv-band', band)}>
            <div className="hv-band-inner">
              <Reveal style="slide-up">
                <header className="hv-collection-head">
                  <div className="hv-ghost-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</div>
                  <div className="hv-eyebrow accent" style={{ marginBottom: 14 }}>
                    Collection {String(i + 1).padStart(2, '0')} — {sectionCards.length} poster{sectionCards.length === 1 ? '' : 's'}
                  </div>
                  <h2 className="hv-h2">{collection.title}</h2>
                  <div className="hv-sub-italic" style={{ fontSize: 21, marginTop: 8 }}>{collection.sub}</div>
                  <p className="hv-body" style={{ marginTop: 16, maxWidth: '58ch' }}>{collection.blurb}</p>
                </header>
              </Reveal>

              {/* Spotlight lead poster, image side alternating per section */}
              <Reveal style="slide-up" delay={0.08}>
                <div className={cn('hv-spotlight', i % 2 === 1 && 'flip')}>
                  <SpotlightImage card={spotlight} />
                  <div className="hv-spotlight-body">
                    <div className="hv-eyebrow accent" style={{ marginBottom: 12 }}>Featured</div>
                    <h3 className="hv-h2" style={{ fontSize: 30 }}>{spotlight.title}</h3>
                    {spotlight.date && (
                      <div className="hv-mono" style={{ color: 'var(--ink-4)', marginTop: 8 }}>{spotlight.date}</div>
                    )}
                    {spotlight.caption && (
                      <p className="hv-body" style={{ marginTop: 14 }}>{spotlight.caption}</p>
                    )}
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', marginTop: 24 }}>
                      {spotlight.downloadUrl && (
                        <a
                          href={spotlight.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hv-btn hv-btn-primary"
                        >
                          Download PDF <span className="arr">↓</span>
                        </a>
                      )}
                      <LearnMoreLink href={spotlight.learnMoreLink} />
                    </div>
                  </div>
                </div>
              </Reveal>

              {rest.length > 0 && (
                <div className="hv-grid">
                  {rest.map((card, j) => (
                    <Reveal key={card.id} style="slide-up" delay={Math.min(j * 0.05, 0.25)} className="h-full">
                      <PosterCardComponent card={card} />
                    </Reveal>
                  ))}
                </div>
              )}
            </div>
          </section>
        )
      })}

      {/* ─── Put them to work ──────────────────────────────── */}
      <section className="hv-band" style={{ background: 'var(--accent)', color: '#fff' }}>
        <div className="hv-band-inner" style={{ textAlign: 'center' }}>
          <h2 className="hv-h2" style={{ color: '#fff', maxWidth: '24ch', margin: '0 auto' }}>
            Print them. Remix them. Hang them in your clinic.
          </h2>
          <p className="hv-body-lg" style={{ color: 'rgba(255,255,255,0.85)', maxWidth: '54ch', margin: '20px auto 36px' }}>
            That&rsquo;s what the licenses are for. And if there&rsquo;s a health system you need made
            visible, we take commissions — and suggestions.
          </p>
          <a href="mailto:info@goinvo.com" className="hv-btn hv-btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.7)' }}>
            Suggest a visualization <span className="arr">→</span>
          </a>
        </div>
      </section>

      {/* ─── Subscribe ─────────────────────────────────────── */}
      <section className="hv-band warm" style={{ paddingTop: 64, paddingBottom: 64 }}>
        <div className="hv-band-inner" style={{ maxWidth: 880 }}>
          <Reveal style="slide-up">
            <SubscribeForm />
          </Reveal>
        </div>
      </section>
    </div>
  )
}

function SpotlightImage({ card }: { card: PosterCard }) {
  const img = card.imageUrl ? (
    <Image
      src={card.imageUrl}
      alt={card.title}
      fill
      sizes="(max-width: 980px) 100vw, 640px"
      style={{ objectFit: 'cover' }}
    />
  ) : null
  return card.downloadUrl ? (
    <a
      href={card.downloadUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="hv-spotlight-img"
      aria-label={`Download ${card.title} PDF`}
    >
      {img}
    </a>
  ) : (
    <div className="hv-spotlight-img">{img}</div>
  )
}

function LearnMoreLink({ href, label = 'Learn more' }: { href: string; label?: string }) {
  if (!href) return null
  const external = href.startsWith('http')
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="hv-btn-text"
    >
      {label} <span className="arr">→</span>
    </a>
  )
}

function PosterCardComponent({ card }: { card: PosterCard }) {
  const imageBlock = card.imageUrl ? (
    <Image
      src={card.imageUrl}
      alt={card.title}
      fill
      sizes="(max-width: 560px) 100vw, (max-width: 980px) 50vw, 360px"
      style={{ objectFit: 'cover' }}
    />
  ) : null

  return (
    <div className="hv-card h-full">
      {card.downloadUrl ? (
        <a
          href={card.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hv-card-img"
          aria-label={`Download ${card.title} PDF`}
        >
          {imageBlock}
        </a>
      ) : (
        <div className="hv-card-img">{imageBlock}</div>
      )}
      <div className="hv-card-body">
        <div className="hv-card-title-row">
          <h3 className="hv-card-title">{card.title}</h3>
          {card.date && <span className="hv-card-date">{card.date}</span>}
        </div>
        {card.caption && <p className="hv-card-caption">{card.caption}</p>}
        <div className="hv-card-actions">
          {card.downloadUrl && (
            <a
              href={card.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hv-btn-text accent"
            >
              Download <span className="arr down">↓</span>
            </a>
          )}
          <LearnMoreLink href={card.learnMoreLink} />
        </div>
      </div>
    </div>
  )
}
