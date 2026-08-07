import Link from 'next/link'
import { HomeGoinvoAtHomeCta } from './HomeGoinvoAtHomeCta'

/**
 * "Bring GoInvo home" — a homepage section that invites visitors to take the
 * open-source health visualizations off the screen and into their space, and
 * quietly routes them to the prints collection. Deliberately NOT framed as a
 * store: the offer is the design, free to download or available as a print.
 *
 * Presence/absence is A/B tested via ShopSectionGate (experiment
 * `home-shop-section`), so we can confirm it guides people to the collection
 * without dampening the homepage's primary job. Server-rendered by default so
 * the section — and its #goinvo-at-home anchor — exist without JS; the gate
 * only removes it for the experiment's "absent" cohort.
 */

type HomePrint = { _id: string; title: string; imageUrl: string }

// Curated straight from the storefront's own poster set (static files in
// /public/images/features). The visualizations carry no Sanity image, so these
// are the canonical print images — same source the collection page uses.
const FEATURED_PRINTS: HomePrint[] = [
  { _id: 'precision-autism', title: 'Precision Autism', imageUrl: '/images/features/precision-autism/precision-autism.jpg' },
  { _id: 'patient-data-ownership', title: 'Own Your Health Data', imageUrl: '/images/features/own-your-health-data/patient-data-ownership.jpg' },
  { _id: 'how-to-vote-early', title: 'How to Vote Early', imageUrl: '/images/features/posters/how-to-vote-early.jpg' },
]

export function HomeGoinvoAtHome() {
  const prints = FEATURED_PRINTS

  return (
    <section
      id="goinvo-at-home"
      aria-labelledby="goinvo-at-home-heading"
      className="scroll-mt-24 bg-[#11141f] py-20 text-white"
    >
      <div
        className={`mx-auto grid max-w-6xl gap-12 px-6 lg:items-center ${
          prints.length > 0 ? 'lg:grid-cols-2' : 'max-w-3xl'
        }`}
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7fd4e0]">
            Open-source health design
          </p>
          <h2
            id="goinvo-at-home-heading"
            className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl"
          >
            Put a little GoInvo on your wall.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-[#d9dee7]">
            The health visualizations we make are free to download and open-source — take the files
            and use them however you like. Want a finished piece for the studio, the clinic, or the
            kitchen? Order it as a print and we&rsquo;ll ship it to you.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <HomeGoinvoAtHomeCta
              href="/vision/health-visualizations"
              className="bg-[#7fd4e0] px-6 py-3 font-semibold text-[#11141f] no-underline transition-colors hover:bg-white"
            >
              Explore the collection
            </HomeGoinvoAtHomeCta>
            <HomeGoinvoAtHomeCta
              href="/vision/health-visualizations#catalog"
              className="border border-white/35 px-6 py-3 font-semibold text-white no-underline transition-colors hover:bg-white/10"
            >
              Download the files
            </HomeGoinvoAtHomeCta>
          </div>
          <p className="mt-5 text-sm text-[#9aa4b2]">
            Free open-source PDFs · $6 per print, plus $6 flat US shipping
          </p>
        </div>

        {prints.length > 0 && (
          <div className="grid grid-cols-3 gap-4" aria-hidden="true">
            {prints.map((print, index) => (
              <Link
                key={print._id}
                href="/vision/health-visualizations"
                className={`block overflow-hidden bg-white/5 shadow-lg transition-transform hover:-translate-y-1 ${
                  index === 1 ? 'translate-y-6' : ''
                }`}
              >
                {/* Plain img on purpose: the Sanity CDN URL is already sized, and
                    this keeps the marketing thumbnail free of next/image config. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={print.imageUrl}
                  alt={print.title || 'GoInvo health visualization print'}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
