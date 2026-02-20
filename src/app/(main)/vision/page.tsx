import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { SubscribeForm } from '@/components/forms/SubscribeForm'
import { VisionGrid } from '@/components/vision/VisionGrid'
import { cloudfrontImage } from '@/lib/utils'
import type { StaticFeature } from '@/types'

import allFeatures from '@/data/features.json'

export const metadata: Metadata = {
  title: 'Our vision on the future of health',
  description:
    'Our thoughts on the intersection of design, technology, and healthcare.',
}

const spotlightFeature = (allFeatures as StaticFeature[]).find(
  (f) => f.id === 'doodle-to-demo'
)!

// Filter out spotlight feature for the grid (all other features shown)
const gridFeatures = (allFeatures as StaticFeature[]).filter(
  (f) => f.id !== spotlightFeature.id
)

const publicationLogos = [
  {
    name: 'NPR',
    image: '/images/publication-logos/logo-npr.png',
    href: 'https://www.npr.org/sections/health-shots/2014/03/28/295734262/if-a-pictures-worth-1-000-words-could-it-help-you-floss',
  },
  {
    name: 'Forbes',
    image: '/images/publication-logos/logo-forbes.png',
    href: 'https://www.forbes.com/sites/oreillymedia/2014/03/07/defining-and-sculpting-interactions-between-man-and-technology/#23f6861d6571',
  },
  {
    name: 'The Atlantic',
    image: '/images/publication-logos/logo-atlantic.png',
    href: 'https://www.theatlantic.com/health/archive/2013/01/the-future-of-medical-records/267202/',
  },
  {
    name: 'TED',
    image: '/images/publication-logos/logo-ted.png',
    href: 'https://www.ted.com/talks/stephen_friend_the_hunt_for_unexpected_genetic_heroes',
    hiddenMobile: true,
  },
  {
    name: 'The Lancet',
    image: '/images/publication-logos/logo-lancet.png',
    href: 'https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(17)30154-X/fulltext',
  },
  {
    name: 'New Scientist',
    image: '/images/publication-logos/logo-new-scientist.png',
    href: 'https://www.newscientist.com/article/dn25969-my-genes-could-help-cure-childhood-diseases/',
    hiddenMobile: true,
  },
  {
    name: 'Wired',
    image: '/images/publication-logos/logo-wired.png',
    href: 'https://www.wired.com/2013/01/medical-record-redesign/',
    hiddenMobile: true,
  },
]

const reviews = [
  {
    id: 'inspired-ehrs',
    quote:
      "I sent this around to our User Experience team here, and there was a lot of discussion and appreciation for the work you've done.",
    quotee: 'Janet Campbell',
    quoteeSub: 'Epic',
    image: '/images/services/inspired-ehrs-book.jpg',
    ctaText: 'Read the Case Study',
    ctaLink: '/work/inspired-ehrs',
    ctaExternal: false,
  },
  {
    id: 'emerging-tech',
    quote:
      "If you're looking for insights into how to design the future today, look no further.",
    quotee: 'Dan Saffer',
    quoteeSub: 'Author of Microinteractions',
    image: '/images/vision/emerging-tech-wood.jpg',
    ctaText: 'Check out the Book',
    ctaLink:
      'https://www.amazon.com/Designing-Emerging-Technologies-Genomics-Robotics/dp/1449370519',
    ctaExternal: true,
  },
  {
    id: 'determinants',
    quote:
      'The SDoH poster stands taped to the giant whiteboard outside my office [at Google Cityblock Health Labs], and will form the basis of many rich conversations among my team. Thank you!',
    quotee: 'Toyin Ajayi',
    quoteeSub: 'Chief Health Officer of Cityblock Health',
    image: '/images/services/doh-preview.jpg',
    ctaText: 'Read the Feature',
    ctaLink: '/vision/determinants-of-health/',
    ctaExternal: false,
  },
  {
    id: 'healthroom',
    quote:
      'Designers at GoInvo have the right ideas for the smart medical home of the future.',
    quotee: 'Eric Topol',
    quoteeSub: 'Scripps Translational Science Institute',
    image:
      '/images/features/bathroom-to-healthroom/bathroom-to-healthroom-featured.jpg',
    ctaText: 'Read the Feature',
    ctaLink:
      'https://www.goinvo.com/features/from-bathroom-to-healthroom/',
    ctaExternal: true,
  },
]

export default function VisionPage() {
  return (
    <div>
      {/* Spotlight */}
      <div className="max-width content-padding py-8 lg:py-16">
        <h3 className="font-serif text-xl mb-8">Spotlight</h3>
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
          {/* Spotlight feature (2/3) */}
          <a
            href={spotlightFeature.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow no-underline"
          >
            <div className="h-[260px] overflow-hidden bg-gray-medium">
              {spotlightFeature.video ? (
                <video
                  src={cloudfrontImage(spotlightFeature.video)}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image
                  src={cloudfrontImage(spotlightFeature.image)}
                  alt={spotlightFeature.title}
                  width={680}
                  height={260}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="p-4">
              <p className="font-bold text-black mb-1">
                {spotlightFeature.title}
              </p>
              <p className="text-gray text-sm mb-1">
                Feature | {spotlightFeature.date}
              </p>
              {spotlightFeature.caption && (
                <p className="text-gray text-sm">
                  {spotlightFeature.caption}
                </p>
              )}
            </div>
          </a>

          {/* Health Visualizations (1/3) */}
          <Link
            href="/vision/health-visualizations"
            className="group block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow no-underline"
          >
            <div className="h-[260px] overflow-hidden">
              <Image
                src={cloudfrontImage(
                  '/images/features/posters/health-viz-vision-preview-2.jpg'
                )}
                alt="Health Visualizations"
                width={400}
                height={260}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4">
              <p className="font-bold text-black mb-1">
                Health Visualizations
              </p>
              <p className="text-gray text-sm">
                Open source visualizations on health and the healthcare
                industry.
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="bg-blue-light py-4 lg:py-16">
        <div className="max-width content-padding">
          <h3 className="font-serif text-xl mb-8">
            Features{' '}
            <span className="text-gray text-sm font-sans">
              ({gridFeatures.length})
            </span>
          </h3>
          <VisionGrid features={gridFeatures} />
        </div>
      </div>

      {/* Publications */}
      <div className="max-width content-padding py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <Image
              src={cloudfrontImage('/images/vision/emerging-tech-books.jpg')}
              alt="Emerging Technology Books"
              width={510}
              height={340}
              className="w-full h-auto"
            />
          </div>
          <div>
            <h2 className="font-serif text-3xl mb-4">
              Design and Tech Publications
            </h2>
            <p className="text-gray mb-6">
              Preview our books on product design, emerging technology,
              prototyping, and the internet of things, published by O&apos;Reilly
              Media.
            </p>
            <div className="mb-2">
              <a
                href="https://www.amazon.com/Designing-Emerging-Technologies-Genomics-Robotics/dp/1449370519"
                target="_blank"
                rel="noopener noreferrer"
              >
                Designing for Emerging Technologies
              </a>
            </div>
            <div className="mb-2">
              <a
                href="https://www.oreilly.com/design/free/future-of-product-design.csp"
                target="_blank"
                rel="noopener noreferrer"
              >
                The Future of Product Design
              </a>
            </div>
            <div className="mb-2">
              <a
                href="https://creativenext.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                Creative Next
              </a>{' '}
              podcast, on{' '}
              <a
                href="https://itunes.apple.com/us/podcast/creative-next/id1451673481?mt=2"
                target="_blank"
                rel="noopener noreferrer"
              >
                iTunes
              </a>{' '}
              and{' '}
              <a
                href="https://open.spotify.com/show/3TEs0y2xkFhrdrftDj2LrH"
                target="_blank"
                rel="noopener noreferrer"
              >
                Spotify
              </a>
            </div>
            <div className="mb-2">
              The Digital Life podcast, on{' '}
              <a
                href="https://soundcloud.com/involution-studios"
                target="_blank"
                rel="noopener noreferrer"
              >
                SoundCloud
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Featured In */}
      <div className="bg-gray-light">
        <div className="max-width content-padding py-8 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 items-center">
            <h2 className="font-serif text-2xl m-0 lg:pr-8">
              Our design and analysis has been featured in
              <span className="text-primary font-serif">...</span>
            </h2>
            <ul className="flex flex-wrap justify-around items-center gap-6 lg:gap-8 list-none p-0 m-0">
              {publicationLogos.map((pub) => (
                <li
                  key={pub.name}
                  className={pub.hiddenMobile ? 'hidden lg:block' : ''}
                >
                  <a
                    href={pub.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Image
                      src={pub.image}
                      alt={`${pub.name} logo`}
                      width={80}
                      height={40}
                      className="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="max-width content-padding pt-16">
        <h2 className="font-serif text-3xl mb-0">
          Reviews for
          <span className="text-primary font-serif">...</span>
        </h2>
      </div>
      <div className="space-y-0">
        {reviews.map((review) => (
          <div key={review.id} className="bg-gray-light">
            <div className="max-width content-padding">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="h-[260px] lg:h-[360px] overflow-hidden">
                  <Image
                    src={cloudfrontImage(review.image)}
                    alt=""
                    width={510}
                    height={360}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center p-8 lg:p-12">
                  <blockquote className="text-gray font-serif text-lg leading-relaxed italic m-0">
                    &ldquo;{review.quote}&rdquo;
                  </blockquote>
                  <p className="text-sm mt-4 mb-0">
                    <span className="font-semibold">{review.quotee}</span>
                    <br />
                    <span className="text-gray">{review.quoteeSub}</span>
                  </p>
                  {review.ctaExternal ? (
                    <a
                      href={review.ctaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button button--primary button--lg mt-6 self-start inline-block bg-primary text-white font-semibold px-8 py-3 no-underline hover:opacity-90 transition-opacity"
                    >
                      {review.ctaText}
                    </a>
                  ) : (
                    <Link
                      href={review.ctaLink}
                      className="mt-6 self-start inline-block bg-primary text-white font-semibold px-8 py-3 no-underline hover:opacity-90 transition-opacity"
                    >
                      {review.ctaText}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Subscribe */}
      <div className="bg-gray-light py-16">
        <div className="max-width-md content-padding mx-auto">
          <SubscribeForm />
        </div>
      </div>

      {/* CTA */}
      <div className="max-width max-width-sm content-padding py-16">
        <h2 className="font-serif text-2xl">
          Designing the future of healthcare
          <span className="text-primary font-serif">.</span>
        </h2>
        <p className="text-gray">
          We&apos;re always looking for new ways to improve healthcare through
          design. If you have an idea or want to collaborate, we&apos;d love to
          hear from you.
        </p>
        <Link
          href="/contact/"
          className="inline-block border-2 border-secondary text-secondary font-semibold px-8 py-3 mt-4 no-underline hover:bg-secondary hover:text-white transition-colors"
        >
          Get in touch
        </Link>
      </div>
    </div>
  )
}
