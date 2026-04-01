'use client'

import {
  ColorScrollWrapper,
  DisruptHeroVideo,
  AnimatedTitle,
  DisruptNavBar,
  BottomNav,
} from './DisruptClient'
import { legacyImage } from './disrupt-shared'

/**
 * Disrupt Part 1: Emerging Technologies
 *
 * Directly translated from:
 * - /c/tmp/legacy-features/disrupt/page.html (structure)
 * - /c/tmp/legacy-features/disrupt/styles-pretty.css (styles → disrupt.css)
 * - Legacy disrupt.js (effects → DisruptClient.tsx)
 */
export function DisruptPageClient() {
  return (
    <ColorScrollWrapper partIndex={0}>
      {/* ===== Fixed Article Navigation ===== */}
      <DisruptNavBar currentPart={1} />

      {/* ===== Top Hero with Animated Title ===== */}
      <header className="article-header">
        <div className="header-contents top-vid" id="top">
          <div className="video-container">
            <DisruptHeroVideo partNumber={1} position="top" />
          </div>
          <AnimatedTitle />
        </div>
      </header>

      {/* ===== Article Content ===== */}
      <article className="disrupt" id="feature-article">
        <section className="article-section" id="section-1">
          <div className="section-content">
            <div className="content">
              <div className="sub-sec">
                <h3>Emerging Technologies</h3>

                <p>
                  Over the next 30 years, there is little that humans can dream
                  that we won&apos;t be able to do &mdash; from hacking our DNA,
                  to embedding computers in our bodies, to printing replacement
                  organs. The fantastic visions of our science fiction today will
                  become the reality of tomorrow, as we redefine what it means to
                  be human. This period of technological advancement will alter the
                  way we live our lives in nearly every way &mdash; much like the
                  Second Industrial Revolution in America established the modern
                  age at the turn of the 20th century, when inventions from
                  electric power to the automobile first became prominent and
                  experienced widespread adoption.
                </p>

                {/* Sidebar images — float right on desktop, inline on mobile */}
                <div className="images sidebar right">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-1-lockheed-martin.png')}
                      alt="Lockheed Martin FORTIS exoskeleton"
                    />
                    <div className="caption">
                      Lockheed Martin&apos;s FORTIS exoskeleton
                    </div>
                  </div>
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-1-e-chromi.png')}
                      alt="E. chromi disease monitoring system"
                    />
                    <div className="caption">
                      The e.chromi disease monitoring system
                    </div>
                  </div>
                </div>

                <p>
                  Today, emerging technologies from robotics to synthetic biology
                  to the Internet of Things are already opening up new
                  possibilities for extending our reach, enabling us to become
                  seemingly superhuman. As one example of this, the FORTIS
                  exoskeleton from Lockheed Martin gives its user tremendous
                  strength &mdash; allowing an operator to lift and use heavy
                  tools as if the objects were weightless by transferring the
                  weight loads through the exoskeleton to the ground. E. chromi
                  &mdash; the Grand Prize winner at the 2009 International
                  Genetically Engineered Machine Competition (iGEM) by Alexandra
                  Daisy Ginsberg and her collaborators &mdash; advances the
                  existing relationship we have with our microbiome, the
                  microorganisms living on and inside us. The genetically altered
                  e. chromi bacteria can serve as an early warning system for
                  disease, changing the color of human waste to indicate the
                  presence of a dangerous toxin or pathogen. For instance, if
                  drinking water were tainted, fecal matter could be colored a
                  brilliant red. In the future, a variety of day-glo colors might
                  indicate a dangerous array of contaminants from malaria to the
                  swine flu. Perhaps not what we all had in mind for a super
                  power, but amazing nonetheless.
                </p>

                {/* Mobile-only duplicate of sidebar images */}
                <div className="images sidebar middle">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-1-lockheed-martin.png')}
                      alt="Lockheed Martin FORTIS exoskeleton"
                    />
                    <div className="caption">
                      Lockheed Martin&apos;s FORTIS exoskeleton
                    </div>
                  </div>
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-1-e-chromi.png')}
                      alt="E. chromi disease monitoring system"
                    />
                    <div className="caption">
                      The e.chromi disease monitoring system
                    </div>
                  </div>
                </div>

                <p>
                  What does it mean to create products and services that have the
                  potential to disrupt our society and our economy? We will need to
                  rethink and remake our interactions, our infrastructure, and
                  maybe even our institutions. As we face a future where what it
                  means to be human could be inexorably changed, we desperately
                  need experience design to help frame our interactions with
                  emerging technologies that are already racing ahead of our
                  ability to process and manage them on an emotional, ethical, and
                  societal level. Whether we&apos;re struggling with fear and
                  loathing in reaction to genetically altered foods, the moral
                  issues of changing a child&apos;s traits to suit a parent&apos;s
                  preferences, the ethics guiding battlefield robots, or the
                  societal implications of a 150-year extended lifetime, it&apos;s
                  abundantly clear that the future of experience design will be to
                  envision humanity&apos;s relationship to technology and each
                  other.
                </p>

                <p>
                  The coming wave of technological change will make the tumult and
                  disruption of the past decade&apos;s digital and mobile
                  revolutions look like a minor blip by comparison. As we look
                  beyond the screen to the rich world of interactions and
                  experiences that need to be designed, we need to define new areas
                  of practice. Experience design will be critical to tie the
                  technology to human use and benefit. For those asking &ldquo;How
                  can we do this?&rdquo; we must counter, &ldquo;Why and for whose
                  benefit?&rdquo;
                </p>
              </div>
            </div>
          </div>
        </section>
      </article>

      {/* ===== Bottom Hero ===== */}
      <header className="sec-header bottom-vid" id="bottom">
        <div className="video-container">
          <DisruptHeroVideo partNumber={1} position="bottom" />
        </div>
      </header>

      {/* ===== Next Part Navigation ===== */}
      <BottomNav
        nextHref="/vision/disrupt/part-2"
        nextTitle="from horse to horsepower"
        color="#E68B35"
      />
    </ColorScrollWrapper>
  )
}
