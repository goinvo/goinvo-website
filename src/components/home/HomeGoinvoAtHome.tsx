import Link from 'next/link'
import { sanityFetch } from '@/sanity/lib/live'
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

type HomePrint = { _id: string; title?: string; slug?: string; imageUrl?: string }

async function getFeaturedPrints(): Promise<HomePrint[]> {
  try {
    // Resolve the CDN URL straight from the asset in GROQ (no urlForImage
    // dependency), then size it with Sanity CDN params. Robust to any image
    // helper edge case — the whole section is best-effort anyway.
    const { data } = (await sanityFetch({
      query: `*[_type == "healthVisualization" && defined(image.asset)][0...3]{
        _id, title, "slug": slug.current, "imageUrl": image.asset->url
      }`,
    })) as { data: Array<{ _id: string; title?: string; slug?: string; imageUrl?: string }> }
    return (data || [])
      .filter((item) => item.imageUrl)
      .map((item) => ({
        _id: item._id,
        title: item.title,
        slug: item.slug,
        imageUrl: `${item.imageUrl}?w=600&h=760&fit=crop&auto=format`,
      }))
  } catch {
    // The section stands on its own without imagery; never let a fetch hiccup
    // remove it from the page.
    return []
  }
}

export async function HomeGoinvoAtHome() {
  const prints = (await getFeaturedPrints()).filter((print) => print.imageUrl)

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
