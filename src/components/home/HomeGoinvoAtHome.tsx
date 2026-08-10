import Link from 'next/link'
import { cloudfrontImage } from '@/lib/utils'
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
 *
 * One CTA, and the posters are assembled like the shop page's own hero spray
 * (full posters on cream mats, slight rotations) — the flat cropped-thumbnail
 * trio and the second button both got flagged (Juhan's feedback, 2026-08-07).
 * A single unanchored link also avoids the page-transition + anchor-jump
 * double hop the old "Download the files" button caused.
 */

type HomePrint = { _id: string; title: string; imageUrl: string }

// The same trio the shop hero leads with (Jon's picks) so clicking through
// lands on a container that visibly continues this one.
const FEATURED_PRINTS: HomePrint[] = [
  { _id: 'make-things', title: 'Make Things', imageUrl: '/images/features/posters/design-axiom-make-things.jpg' },
  { _id: 'precision-autism', title: 'Precision Autism', imageUrl: '/images/features/precision-autism/precision-autism.jpg' },
  { _id: 'patient-data-ownership', title: 'Own Your Health Data', imageUrl: '/images/features/own-your-health-data/patient-data-ownership.jpg' },
]

// Mirrors the storefront hero's composition: portrait left, landscape high
// right, portrait tucked bottom-right. Percentage widths keep the spray
// assembled at every viewport instead of collapsing to tiny cropped tiles.
const SPRAY_PLACEMENT = [
  'left-0 top-[10%] w-[44%] -rotate-6',
  'right-0 top-0 w-[54%] rotate-6',
  'right-[8%] bottom-0 w-[40%] -rotate-2',
]

export function HomeGoinvoAtHome() {
  const prints = FEATURED_PRINTS

  return (
    <section
      id="goinvo-at-home"
      aria-labelledby="goinvo-at-home-heading"
      className="scroll-mt-24 bg-[#11141f] py-20 text-white"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
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
            The health visualizations we make are free to download and open-source. Take the files
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
          </div>
          <p className="mt-5 text-sm text-[#9aa4b2]">
            Free open-source PDFs · $30 per print, plus $6 flat US shipping
          </p>
        </div>

        <Link
          href="/vision/health-visualizations"
          aria-hidden="true"
          tabIndex={-1}
          className="relative block aspect-square max-w-[520px] justify-self-center w-full lg:justify-self-end"
        >
          {prints.map((print, index) => (
            <span
              key={print._id}
              className={`absolute block border border-white/20 bg-[#f7f3ea] p-2 shadow-[0_26px_65px_rgba(0,0,0,.42)] sm:p-3 ${SPRAY_PLACEMENT[index]}`}
            >
              <span className="block bg-white">
                {/* Plain img on purpose: static CDN posters at natural aspect,
                    free of next/image config. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cloudfrontImage(print.imageUrl)}
                  alt=""
                  loading="lazy"
                  className="block h-auto w-full"
                />
              </span>
              <span className="mt-2 block truncate font-serif text-sm leading-tight text-[#11141f] sm:text-base">
                {print.title}
              </span>
            </span>
          ))}
        </Link>
      </div>
    </section>
  )
}
