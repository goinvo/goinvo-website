'use client'

/**
 * The opening, after FELINES' teaser: one sentence per screen.
 *
 * Beat 1 (on load): the two-line claim wipes in on night, with the call to action.
 * Beat 2 (scroll): cream rises from the bottom like a fill, inverting the claim,
 *   then the argument arrives one word at a time as you scroll.
 * Phones and reduced-motion readers get the same words as plain flowing sections.
 */

import type { CSSProperties } from 'react'
import { motion, useTransform, type MotionValue } from 'framer-motion'
import { HomeConceptCtaLink } from '@/components/home/HomeConceptCtaLink'
import { Beat, ReadAlong, ScrubWords, StickyStage } from './storyMotion'
import { opening } from './storyContent'

const delay = (ms: number) => ({ '--d': ms }) as CSSProperties

function Arrow() {
  return (
    <svg className="hs-arrow" width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
      <path d="M1 6h13M9.5 1.5 14 6l-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Claim({ tone, animate }: { tone: 'night' | 'cream'; animate: boolean }) {
  const ink = tone === 'night' ? 'text-white' : 'text-[var(--hs-ink)]'
  const accent = tone === 'night' ? 'text-[var(--hs-accent-night)]' : 'text-[var(--hs-accent)]'
  const wipe = animate ? 'hs-onload-wipe' : ''
  const rise = animate ? 'hs-onload-rise' : ''
  // The cream copy is a painted duplicate (aria-hidden); it must not be a second h1.
  const Heading = tone === 'night' ? 'h1' : 'div'
  return (
    <>
      <p className={`hs-eyebrow mb-7 ${accent} ${rise}`} style={delay(100)}>
        {opening.eyebrow}
      </p>
      <Heading className={`hs-serif m-0 text-[clamp(3rem,7.2vw,6.6rem)] leading-[0.98] tracking-[-0.025em] ${ink}`}>
        <span className={`block text-balance ${wipe}`} style={delay(250)}>
          {opening.line1}
        </span>
        <span className={`block text-balance italic ${accent} ${wipe}`} style={delay(750)}>
          {opening.line2}
        </span>
      </Heading>
    </>
  )
}

function Ctas({ tone, location }: { tone: 'night' | 'cream'; location: string }) {
  return (
    <div className="hs-onload-rise mt-11 flex flex-wrap items-center gap-6" style={delay(1300)}>
      <HomeConceptCtaLink
        href="#book"
        label="Book a discovery call"
        location={location}
        variant="transparent"
        qualifiedDiscoveryCall
        className="hs-button !normal-case !tracking-normal"
      >
        <span>Book a discovery call</span>
        <Arrow />
      </HomeConceptCtaLink>
      <a href="#people" className="hs-link" style={tone === 'night' ? ({ '--hs-link-color': 'rgba(255,255,255,0.88)' } as CSSProperties) : undefined}>
        Or see the work <Arrow />
      </a>
    </div>
  )
}

function OpeningStage({ progress }: { progress: MotionValue<number> }) {
  // Beat 1 → 2: the cream fill rises over the claim.
  const fillTop = useTransform(progress, [0.06, 0.32], [100, 0])
  const fillClip = useTransform(fillTop, (v) => `inset(${v}% 0 0 0)`)
  const invertedOpacity = useTransform(progress, [0.3, 0.4], [1, 0])
  // Once covered, the night layer (and its buttons) must stop taking clicks and Tab.
  const nightVisibility = useTransform(progress, (p) => (p < 0.34 ? 'visible' : 'hidden'))
  const hintOpacity = useTransform(progress, [0, 0.05], [1, 0])

  return (
    <div className="relative h-full bg-[var(--hs-night)]">
      <motion.div style={{ visibility: nightVisibility }} className="absolute inset-0 flex items-center">
        <div className="mx-auto w-full max-w-[1280px] px-14">
          <Claim tone="night" animate />
          <Ctas tone="night" location="home-story-hero" />
        </div>
      </motion.div>

      {/* The fill: same layout in cream ink, so the wipe reads as one surface
          changing colour. It never takes pointer events; the buttons beneath stay live
          until the fill has covered them. */}
      <motion.div
        aria-hidden="true"
        style={{ clipPath: fillClip }}
        className="pointer-events-none absolute inset-0 bg-[var(--hs-cream)]"
      >
        <motion.div style={{ opacity: invertedOpacity }} className="flex h-full items-center">
          <div className="mx-auto w-full max-w-[1280px] px-14">
            <Claim tone="cream" animate={false} />
            <div className="mt-11 flex items-center gap-6">
              <span className="hs-button">
                Book a discovery call <Arrow />
              </span>
              <span className="hs-link">
                Or see the work <Arrow />
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto w-full max-w-[1280px] px-14">
          <Beat progress={progress} enter={0.38} hold={0.46} from="bottom">
            <p className="hs-serif m-0 text-[clamp(2.4rem,4.6vw,4.2rem)] leading-[1.02] tracking-[-0.02em] text-[var(--hs-ink)]">
              {opening.lead}
            </p>
          </Beat>
          <Beat progress={progress} enter={0.42} hold={0.48} from="fade">
            <ScrubWords
              text={opening.body}
              progress={progress}
              start={0.48}
              end={0.78}
              className="mt-8 max-w-[34ch] text-[clamp(1.4rem,2.2vw,2rem)] leading-[1.4] text-[var(--hs-ink-2)]"
            />
          </Beat>
          <Beat progress={progress} enter={0.8} hold={0.88} from="fade">
            <p className="hs-serif mt-8 text-[clamp(1.8rem,3vw,2.6rem)] italic text-[var(--hs-accent)]">{opening.coda}</p>
          </Beat>
        </div>
      </div>

      <motion.div
        style={{ opacity: hintOpacity }}
        className="hs-scroll-hint pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-2 text-white/60"
      >
        <span className="text-[13px] tracking-wide">Scroll to read</span>
        <span className="relative block h-8 w-5 rounded-full border border-white/40">
          <span className="hs-scroll-hint-dot absolute left-1/2 top-1.5 -ml-0.5 block h-1.5 w-1 rounded-full bg-white/70" />
        </span>
      </motion.div>
    </div>
  )
}

export function StoryOpening() {
  return (
    <section id="opening" data-story-chapter="opening" aria-label="Opening">
      <div className="hs-staged">
        <StickyStage height={300} label="Opening">
          {(progress) => <OpeningStage progress={progress} />}
        </StickyStage>
      </div>

      <div className="hs-flowing">
        <div className="flex min-h-[calc(92svh-var(--hs-header))] items-center bg-[var(--hs-night)] py-20">
          <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-8">
            <Claim tone="night" animate />
            <Ctas tone="night" location="home-story-hero-mobile" />
          </div>
        </div>
        <div className="bg-[var(--hs-cream)] py-20">
          <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-8">
            <p className="hs-serif m-0 text-[clamp(2.2rem,8vw,3.4rem)] leading-[1.04] tracking-[-0.02em]">{opening.lead}</p>
            <ReadAlong text={opening.body} className="mt-6 max-w-[34ch] text-[1.35rem] leading-[1.45] text-[var(--hs-ink-2)]" />
            <p className="hs-serif mt-6 text-[1.8rem] italic text-[var(--hs-accent)]">{opening.coda}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
