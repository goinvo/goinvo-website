'use client'

import { useRef } from 'react'
import Image from 'next/image'
import Marquee from 'react-fast-marquee'
import { ClientLogos } from '@/components/ui/ClientLogos'
import { Button } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { usePageTransition } from '@/context/PageTransitionContext'
import { cloudfrontImage } from '@/lib/utils'

interface HomeContentProps {
  teamMembers: { name: string; image: string }[]
}

export function HomeContent({ teamMembers }: HomeContentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const ctx = usePageTransition()

  function handleMorphClick(href: string, sectionId: string) {
    const section = document.querySelector(
      `[data-morph-section="${sectionId}"]`
    ) as HTMLElement
    if (!section || !ctx || !containerRef.current) {
      window.location.href = href
      return
    }

    const sectionRect = section.getBoundingClientRect()
    const rawBg = section.style.backgroundImage || ''
    const bgImage = rawBg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '')
    const bgPosition = section.style.backgroundPosition || 'center'

    const card = section.querySelector('[data-morph-card]') as HTMLElement
    if (!card) {
      window.location.href = href
      return
    }
    const cardRect = card.getBoundingClientRect()

    const headerHeight = 50
    const vw = window.innerWidth
    const vh = window.innerHeight
    const heroHeight = vh * 0.5

    ctx.triggerSectionMorph({
      bgRect: {
        top: sectionRect.top,
        left: sectionRect.left,
        width: sectionRect.width,
        height: sectionRect.height,
      },
      bgImage,
      bgPosition,
      cardRect: {
        top: cardRect.top,
        left: cardRect.left,
        width: cardRect.width,
        height: cardRect.height,
      },
      href,
      targetBgRect: {
        top: headerHeight,
        left: 0,
        width: vw,
        height: heroHeight,
      },
      targetCardRect: {
        top: headerHeight + heroHeight,
        left: 0,
        width: vw,
        height: vh - headerHeight - heroHeight,
      },
    })

    // Collapse non-target sections
    const allTopLevel = Array.from(containerRef.current.children) as HTMLElement[]
    const targetTopLevel = allTopLevel.find(
      (child) => child === section || child.contains(section)
    )

    allTopLevel.forEach((child) => {
      if (child !== targetTopLevel) {
        const h = child.offsetHeight
        child.style.overflow = 'hidden'
        child.animate(
          [
            { height: h + 'px', opacity: 1 },
            { height: '0px', opacity: 0 },
          ],
          {
            duration: 500,
            fill: 'forwards',
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }
        )
      }
    })

    // Fade out text inside the card
    const textEls = card.querySelectorAll('h2, p, a, button')
    textEls.forEach((el) => {
      ;(el as HTMLElement).animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 300,
        fill: 'forwards',
        easing: 'ease-out',
      })
    })
  }

  return (
    <div ref={containerRef}>
      {/* 1. Hero Section */}
      <section className="relative flex flex-col justify-end min-h-[250px] min-h-[50vh]">
        <Image
          src={cloudfrontImage('/images/homepage/bg-wavy-lines.jpg')}
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="relative z-10 max-width content-padding w-full pb-10 pt-[calc(var(--spacing-header-height)+2rem)]">
          <h1
            className="font-serif text-2xl md:text-[3rem] md:leading-[3.25rem] mb-0"
            style={{ viewTransitionName: 'page-title' }}
          >
            <strong>We design the future of software</strong>
            <span className="text-primary font-serif">.</span>
            <br />
            <span className="text-gray">For complex systems and real constraints.</span>
          </h1>
          <div className="flex gap-3 mt-4">
            <Button href="/contact" variant="primary">
              Start a Convo
            </Button>
            <Button href="/work" variant="outline">
              View Our Work
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Backlog: Zero - 3M Case Study (LEFT) */}
      <section
        data-morph-section="3m"
        className="relative py-16 md:py-16 bg-cover bg-center min-h-[500px] md:min-h-[600px] flex items-start"
        style={{
          backgroundImage: `url(${cloudfrontImage('/images/homepage/bg-storycard-3m.jpg')})`,
        }}
      >
        <div className="max-width flex justify-start w-full">
          <Reveal style="slide-right">
            <div data-morph-card className="bg-white p-6 md:p-8 w-[85vw] md:w-[380px]">
              <h2 className="font-serif text-2xl md:text-3xl mb-4">
                Backlog: Zero
              </h2>
              <p className="font-serif text-lg text-gray italic font-bold mb-4">
                &ldquo;The system is down.&rdquo;
              </p>
              <p className="text-gray mb-4">
                That was the call we got two weeks after launch, from Memorial
                Hermann hospital in Houston, CodeRyte&apos;s largest customer.
              </p>
              <p className="text-gray mb-4">
                30 minutes later, we found the issue. The new system was operating
                so efficiently that there were zero patients left to code and for a
                brief period, zero work to do.
              </p>
              <p className="text-gray mb-6">
                A backlog that typically measured in thousands of charts and weeks
                of delay had been cleared. This had never happened before.
              </p>
              <Button onClick={() => handleMorphClick('/work/3m-coderyte', '3m')} variant="primary">
                3M Case Study
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3. Eric Topol Testimonial */}
      <section
          className="relative py-16 md:py-24 bg-cover min-h-[500px] md:min-h-[600px]"
          style={{
            backgroundImage: `linear-gradient(to bottom right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 50%, transparent 100%), url(${cloudfrontImage('/images/homepage/eric-topol-2.jpg')})`,
            backgroundPosition: 'center, top right',
          }}
        >
          <div className="max-width content-padding">
            <p className="font-serif text-2xl md:text-[1.75rem] lg:text-[2rem] italic text-white leading-[1.8] mb-6 max-w-[700px]">
              &ldquo;The GoInvo studio is one of the most talented groups of
              designers I have ever met in the healthcare space. Not only are
              their ideas, designs, and graphics remarkable, but I haven&apos;t yet
              figured out how they know so much about medicine and its
              future.&rdquo;
            </p>
            <p className="text-white mb-0">
              <span className="font-semibold">Eric Topol, MD</span>
              <br />
              <span className="text-white/80">Scripps Research Translational Institute</span>
              <br />
              <span className="text-white/40 text-xs">
                Photo by{' '}
                <a href="https://www.flickr.com/photos/euthman/8197577252/" className="text-white/40" target="_blank" rel="noopener noreferrer">
                  Ed Uthman
                </a>
                , licensed under{' '}
                <a href="https://creativecommons.org/licenses/by/2.0/" className="text-white/40" target="_blank" rel="noopener noreferrer">
                  CC BY 2.0
                </a>
              </span>
            </p>
          </div>
        </section>

      {/* 4. Weeks to Hours - Ipsos Case Study (RIGHT) */}
      <section
        data-morph-section="ipsos"
        className="relative py-16 md:py-16 bg-cover min-h-[500px] md:min-h-[600px] flex items-start"
        style={{
          backgroundImage: `url(${cloudfrontImage('/images/homepage/bg-storycard-ipsos.jpg')})`,
          backgroundPosition: 'left center',
        }}
      >
        <div className="max-width content-padding flex md:justify-end w-full">
          <Reveal style="slide-left">
            <div data-morph-card className="bg-white p-6 md:p-10 w-[85vw] md:w-[380px]">
              <h2 className="font-serif text-2xl md:text-3xl mb-4">
                Weeks to Hours
              </h2>
              <p className="text-gray mb-4">
                From Rube Goldberg workflows to enterprise info at your fingertips.
              </p>
              <p className="text-gray mb-4">
                <strong>90%+ adoption across Ipsos.</strong>
                <br />
                <strong>700,000+ prompts per month.</strong>
                <br />
                <strong>10M+ API calls</strong> driving real research, not toys.
              </p>
              <p className="text-gray mb-6">
                Research that took weeks now takes hours. With citations.
              </p>
              <Button onClick={() => handleMorphClick('/work/ipsos-facto', 'ipsos')} variant="primary">
                Ipsos Case Study
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5. Partner Logos */}
      <section className="py-12 md:py-16" style={{ backgroundColor: '#F7FAFE' }}>
        <div className="max-width content-padding">
          <p className="text-sm font-normal text-gray uppercase tracking-wider mb-6">
            Trusted by ambitious startups and Fortune 500&apos;s:
          </p>
          <ClientLogos />
        </div>
      </section>

      {/* 6. 10x increase - SNAP Impact (LEFT) */}
      <section
        data-morph-section="snap"
        className="relative py-16 md:py-16 bg-cover bg-center min-h-[500px] md:min-h-[600px] flex items-start"
        style={{
          backgroundImage: `url(${cloudfrontImage('/images/homepage/bg-storycard-snap.jpg')})`,
        }}
      >
        <div className="max-width flex justify-start w-full">
          <Reveal style="slide-right">
            <div data-morph-card className="bg-white p-6 md:p-8 w-[85vw] md:w-[380px]">
              <h2 className="font-serif text-2xl md:text-3xl mb-6">
                10x increase<span className="text-primary font-serif">.</span>
              </h2>
              <div className="text-gray space-y-4">
                <div>
                  <p><strong>In 2017:</strong></p>
                  <p>
                    750,000 Massachusetts residents relied on SNAP.
                    <br />
                    Just 7% applied online.
                  </p>
                </div>
                <p>Fax. Mail. Walk-ins.</p>
                <div>
                  <p><strong>Two years after redesign:</strong></p>
                  <p>Online applications hit ~44%.</p>
                </div>
                <div>
                  <p><strong>Today:</strong></p>
                  <p>
                    Nearly <strong>1,000,000</strong> people rely on SNAP.
                    <br />
                    <strong>70% apply online.</strong>
                  </p>
                </div>
                <p>
                  A million people didn&apos;t change.
                  <br />
                  <strong>The digital system did.</strong>
                </p>
              </div>
              <Button onClick={() => handleMorphClick('/work/mass-snap', 'snap')} variant="primary" className="mt-6">
                SNAP Case Study
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 7. Newsletter */}
      <Reveal style="slide-up">
        <section className="bg-blue-light py-12 md:py-16">
          <div className="max-width-md content-padding mx-auto">
            <NewsletterForm />
          </div>
        </section>
      </Reveal>

      {/* 9. We are GoInvo */}
      <section className="overflow-hidden">
        {/* Top marquee - scrolls right */}
        <div className="h-[300px] overflow-hidden" aria-hidden="true">
          <Marquee direction="right" speed={30} gradient={false} pauseOnHover={false} autoFill>
            {teamMembers.slice(0, Math.ceil(teamMembers.length / 2)).map((member) => (
              <div key={`top-${member.name}`} className="inline-block w-[300px] h-[300px] mr-2">
                <Image
                  src={member.image}
                  alt=""
                  width={300}
                  height={300}
                  className="w-[300px] h-[300px] object-cover grayscale"
                />
              </div>
            ))}
          </Marquee>
        </div>

        {/* Text content */}
        <div className="max-width content-padding py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-center">
            <div>
              <h2 className="font-serif text-2xl md:text-3xl mb-0">
                We are <span className="text-primary font-serif">GoInvo</span>
                <span className="text-primary font-serif">.</span>
              </h2>
              <p className="text-gray mt-0">
                Small by design. Big thinkers. Sweat the details. Ethics not optional.
              </p>
            </div>
            <div className="flex justify-center">
              <Button href="/about" variant="outline" className="px-8 py-3">
                Meet Our Team
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom marquee - scrolls left */}
        <div className="h-[300px] overflow-hidden" aria-hidden="true">
          <Marquee direction="left" speed={30} gradient={false} pauseOnHover={false} autoFill>
            {teamMembers.slice(Math.ceil(teamMembers.length / 2)).map((member) => (
              <div key={`bottom-${member.name}`} className="inline-block w-[300px] h-[300px] mr-2">
                <Image
                  src={member.image}
                  alt=""
                  width={300}
                  height={300}
                  className="w-[300px] h-[300px] object-cover grayscale"
                />
              </div>
            ))}
          </Marquee>
        </div>
      </section>
    </div>
  )
}
