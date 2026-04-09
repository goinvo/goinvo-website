import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { SubscribeForm } from '@/components/forms/SubscribeForm'
import { Reveal } from '@/components/ui/Reveal'
import { cloudfrontImage } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Our Studio Timeline',
  description:
    "An interactive timeline of GoInvo's history, including events, projects, and people.",
}

export default function StudioTimelinePage() {
  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section
        className="relative h-[450px] bg-cover bg-center"
        style={{
          backgroundImage: `url(${cloudfrontImage('/images/about/studio-timeline/morninglight.jpg')})`,
          viewTransitionName: 'hero-image',
        }}
      >
        <div className="relative h-full max-width">
          <div className="absolute bottom-0 left-0 w-full lg:w-[385px] bg-white/80 content-padding py-8">
            <h1
              className="header-xl m-0"
              style={{ viewTransitionName: 'page-title' }}
            >
              Our studio timeline
              <span className="text-primary font-serif">.</span>
            </h1>
            <p className="text-gray mt-4 mb-0">
              The events, people, and clients who shaped GoInvo over the past 20
              years and today.
            </p>
          </div>
        </div>
      </section>

      {/* Timeline Embed */}
      <section className="py-8">
        <div className="max-width content-padding">
          <iframe
            title="Invo Studio Timeline"
            src="https://cdn.knightlab.com/libs/timeline3/latest/embed/index.html?source=v2:2PACX-1vTIvl6eov0t7l37plBphnF26oCswjKp0pGFWNEK0b8uvTvm0sJKwNADa8s-BgogGLEnJ_gsb7uvST_u&font=Default&lang=en&initial_zoom=2&height=650&start_at_slide=285"
            width="100%"
            height="650"
            allowFullScreen
            className="border-0"
          />
        </div>
      </section>

      {/* Timeline Cards */}
      <Reveal style="slide-up">
        <section className="py-16">
          <div className="max-width content-padding">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <a
                href="https://ChurchOfDesign.org"
                target="_blank"
                rel="noopener noreferrer"
                className="block no-underline"
              >
                <div className="h-[260px] overflow-hidden">
                  <Image
                    src={cloudfrontImage(
                      '/images/about/studio-timeline/goInvo_projects_timeline.jpg'
                    )}
                    alt="GoInvo Project Timeline"
                    width={600}
                    height={375}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="py-4">
                  <p className="font-serif font-light text-[1.5rem] leading-[2.125rem] text-black mb-1">
                    GoInvo Project Timeline
                  </p>
                  <p className="text-gray mb-1">
                    The landscape of open and closed source projects since 2009.
                  </p>
                  <span className="text-secondary underline mt-4 inline-block">Download</span>
                </div>
              </a>
              <Link
                href="/vision/oral-history-goinvo"
                className="block no-underline"
              >
                <div className="h-[260px] overflow-hidden">
                  <Image
                    src={cloudfrontImage(
                      '/images/features/oral-history-goinvo/oral-history-goinvo-featured.jpg'
                    )}
                    alt="Oral History"
                    width={600}
                    height={375}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="py-4">
                  <p className="font-serif font-light text-[1.5rem] leading-[2.125rem] text-black mb-1">
                    Oral History
                  </p>
                  <p className="text-gray mb-1">
                    Inside the early days of GoInvo from 2004-2014, from the
                    people who lived it.
                  </p>
                  <span className="text-secondary underline mt-4 inline-block">Oral History</span>
                </div>
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Newsletter */}
      <section className="bg-gray-light py-16">
        <div className="max-width-md content-padding mx-auto">
          <SubscribeForm />
        </div>
      </section>
    </div>
  )
}
