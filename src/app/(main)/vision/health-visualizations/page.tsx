import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { sanityFetch } from '@/sanity/lib/live'
import { allHealthVisualizationsQuery } from '@/sanity/lib/queries'
import { urlForImage } from '@/sanity/lib/image'
import { cloudfrontImage } from '@/lib/utils'
import { Reveal } from '@/components/ui/Reveal'
import { SubscribeForm } from '@/components/forms/SubscribeForm'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import type { HealthVisualization } from '@/types'

export const metadata: Metadata = {
  title: 'Open Source Healthcare Visualizations',
  description:
    'A repo of open source health visualizations and graphics available to all for use or modification, under a Creative Commons Attribution v3 license or MIT license.',
}

// Normalized card data shared by both Sanity and fallback paths
interface PosterCard {
  id: string
  title: string
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
  { id: 'ebola', title: 'Ebola Care Guideline', image: '/images/features/posters/ebola-care-guideline.jpg', downloadLink: '/pdf/vision/posters/ebola-care-guideline.pdf', learnMoreLink: 'https://www.goinvo.com/features/ebola-care-guideline/' },
  { id: 'data-interop', title: 'Standardized Data for Interoperability', image: '/images/features/posters/standard-health-data.jpg', downloadLink: '/pdf/vision/posters/standard-health-data.pdf', learnMoreLink: 'https://yes.goinvo.com/articles/a-path-towards-standardized-health' },
  { id: 'healthcare-is-a-human-right', title: 'Healthcare is a Human Right', image: '/images/features/posters/care-card-healthcare-is-a-human-right.jpg', downloadLink: '/pdf/vision/posters/care-card-healthcare-is-a-human-right.pdf', learnMoreLink: 'http://carecards.me/#healthcare-human-right' },
  { id: 'examine-yourself', title: 'Examine Yourself', image: '/images/features/posters/care-card-examine-yourself-2.jpg', downloadLink: '/pdf/vision/posters/care-card-examine-yourself.pdf', learnMoreLink: 'http://carecards.me/#examine-yourself' },
  { id: 'sugar-kills', title: 'Sugar Kills', image: '/images/features/posters/care-card-sugar-kills.jpg', downloadLink: '/pdf/vision/posters/care-card-sugar-kills-2.pdf', learnMoreLink: 'http://carecards.me/#sugar-kills' },
  { id: 'make-things', title: 'Make Things', image: '/images/features/posters/design-axiom-make-things.jpg', downloadLink: '/pdf/vision/posters/design-axiom-make-things.pdf', learnMoreLink: 'http://designaxioms.com/' },
  { id: 'let-data-scream', title: 'Let Data Scream', image: '/images/features/posters/design-axiom-let-data-scream.jpg', downloadLink: '/pdf/vision/posters/design-axiom-let-data-scream.pdf', learnMoreLink: 'http://designaxioms.com/' },
  { id: 'prototype-like-crazy', title: 'Prototype Like Crazy', image: '/images/features/posters/design-axiom-prototype-like-crazy.jpg', downloadLink: '/pdf/vision/posters/design-axiom-prototype-like-crazy-2.pdf', learnMoreLink: 'http://designaxioms.com/' },
  { id: 'care-plans-process', title: 'Care Planning Process', image: '/images/features/posters/careplans-process.jpg', downloadLink: '/pdf/vision/posters/careplans-process.pdf', learnMoreLink: 'https://www.goinvo.com/features/careplans/' },
  { id: 'shr-medical-encounter', title: 'SHR Medical Encounter Journey Map', image: '/images/features/posters/shr-medical-encounter-journey-map.jpg', downloadLink: '/pdf/vision/posters/shr-medical-encounter-journey-map.pdf', learnMoreLink: '/work/mitre-shr' },
  { id: 'care-plans-ecosystem', title: 'Care Plans Ecosystem', image: '/images/features/posters/careplans-ecosystem.jpg', downloadLink: '/pdf/vision/posters/careplans-ecosystem.pdf', learnMoreLink: 'https://www.goinvo.com/features/careplans/' },
]

// Slug-to-CloudFront-image lookup so Sanity items without uploaded images still render
const slugToImage: Record<string, string> = Object.fromEntries(
  fallbackPosters.map((p) => [p.id, p.image])
)

function resolveDownloadUrl(link: string): string {
  if (!link) return ''
  return link.startsWith('http') ? link : `https://www.goinvo.com${link}`
}

function normalizeSanityItems(items: HealthVisualization[]): PosterCard[] {
  return items.map((viz) => {
    const slug = viz.slug?.current ?? ''
    const sanityImageUrl = viz.image
      ? urlForImage(viz.image).width(600).height(450).url()
      : null
    const fallbackImageUrl = slugToImage[slug]
      ? cloudfrontImage(slugToImage[slug])
      : ''

    return {
      id: viz._id,
      title: viz.title,
      imageUrl: sanityImageUrl || fallbackImageUrl,
      downloadUrl: resolveDownloadUrl(viz.downloadLink ?? ''),
      learnMoreLink: viz.learnMoreLink ?? '',
    }
  })
}

function normalizeFallbackItems(): PosterCard[] {
  return fallbackPosters.map((p) => ({
    id: p.id,
    title: p.title,
    imageUrl: cloudfrontImage(p.image),
    downloadUrl: resolveDownloadUrl(p.downloadLink),
    learnMoreLink: p.learnMoreLink,
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

  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/posters/health-visualizations-hero-2.jpg')} />

      {/* Intro */}
      <section className="max-width max-width-md content-padding py-12">
        <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">Health Visualizations</h1>
        <Reveal style="slide-up">
          <p className="text-gray leading-relaxed">
            These infographics are open source, available to all under a{' '}
            <a
              href="https://creativecommons.org/licenses/by/3.0/us/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:underline"
            >
              Creative Commons Attribution v3
            </a>{' '}
            license or for the SHR Journey Map and HIE diagram, under a{' '}
            <a
              href="https://opensource.org/licenses/MIT"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:underline"
            >
              MIT
            </a>{' '}
            license.
          </p>
        </Reveal>
      </section>

      {/* Poster Grid */}
      <section className="max-width max-width-md content-padding pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {cards.map((card, i) => (
            <Reveal key={card.id} style="slide-up" delay={Math.min(i * 0.05, 0.3)} className="h-full">
              <PosterCardComponent card={card} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Subscribe */}
      <section className="max-width max-width-md content-padding pb-16">
        <Reveal style="slide-up">
          <SubscribeForm />
        </Reveal>
      </section>

      {/* Newsletter */}
      <section className="bg-gray-lightest py-8">
        <div className="max-width max-width-md content-padding mx-auto">
          <div className="bg-white shadow-card py-6 px-4 md:px-8">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  )
}

function PosterCardComponent({ card }: { card: PosterCard }) {
  const imageBlock = card.imageUrl ? (
    <div className="h-[250px] overflow-hidden">
      <Image
        src={card.imageUrl}
        alt={card.title}
        width={600}
        height={450}
        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
      />
    </div>
  ) : (
    <div className="h-[250px] bg-gray-light" />
  )

  return (
    <div className="flex h-full flex-col bg-white rounded shadow-card hover:shadow-card-hover transition-shadow overflow-hidden">
      {card.downloadUrl ? (
        <a href={card.downloadUrl} target="_blank" rel="noopener noreferrer">
          {imageBlock}
        </a>
      ) : (
        imageBlock
      )}
      <div className="p-4">
        <p className="font-semibold text-black mb-4 leading-snug">{card.title}</p>
        {card.downloadUrl && (
          <a
            href={card.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center border border-primary text-primary font-semibold py-2 text-sm uppercase tracking-[2px] no-underline hover:bg-primary hover:text-white transition-colors"
          >
            Download
          </a>
        )}
        {card.learnMoreLink && (
          <p className="text-center mt-3 text-sm">
            {card.learnMoreLink.startsWith('http') ? (
              <a
                href={card.learnMoreLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:underline"
              >
                Learn More
              </a>
            ) : (
              <Link href={card.learnMoreLink} className="text-secondary hover:underline">
                Learn More
              </Link>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
