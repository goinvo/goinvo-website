'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { usePageTransition, CARD_MORPH_MS } from '@/context/PageTransitionContext'
import { useReducedMotion, ease as curves } from '@/lib/motion'
import { caseHeaderFrame } from '@/lib/caseHeaderFrame'

/** Hero image height to match PersistentHero's image container. */
function getHeroHeight() {
  if (typeof window === 'undefined') return 450
  return window.innerWidth >= 864 ? 450 : 220
}

/** Read the header height from the CSS custom property. */
function getHeaderHeight() {
  if (typeof window === 'undefined') return 50
  return (
    parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--spacing-header-height',
      ),
    ) || 50
  )
}

const ease = curves.emphasized

/**
 * Draws the card transition the PageTransitionContext machine is in. Opening
 * (collapsing → navigating → open) grows the card into the hero; closing (Back
 * from that case study) shrinks the hero back into the card. The timing and the
 * route changes live in the machine; this only draws.
 */
export function CardTransitionOverlay() {
  const ctx = usePageTransition()
  const [hero, setHero] = useState({ top: 50, height: 450, width: 0 })

  // Reduced motion: the machine still runs (with no delays); nothing is drawn.
  const reduced = useReducedMotion()
  const phase = ctx?.phase ?? 'idle'
  const cardRect = ctx?.cardRect ?? null
  const opening = !!cardRect && (phase === 'collapsing' || phase === 'navigating' || phase === 'open')
  const closing = !!cardRect && phase === 'closing'

  // Compute target dimensions when a run starts. clientWidth excludes the
  // scrollbar, matching PersistentHero's in-flow width.
  useEffect(() => {
    if (cardRect) setHero({ top: getHeaderHeight(), height: getHeroHeight(), width: document.documentElement.clientWidth })
  }, [cardRect])

  // Scrim: hides the old page folding away, for exactly as long as the machine
  // is between the click and the new page (a timer here once outlived its phase
  // and left a white sheet over the case study).
  const showScrim = !reduced && (phase === 'collapsing' || phase === 'navigating')

  const cardBox = cardRect && { top: cardRect.top, left: cardRect.left, width: cardRect.width, height: cardRect.height, borderRadius: '4px' }
  // A kept card moves into its own header frame; any other card grows into the
  // full-width hero strip as before.
  const frame = cardRect?.keep && hero.width ? caseHeaderFrame(cardRect.keep.aspect) : null
  const heroBox = { top: hero.top, left: 0, width: hero.width || '100vw', height: hero.height, borderRadius: '0px' }

  return (
    <>
      {/* The machine's phase, for tests and debugging. */}
      <span hidden data-transition-phase={phase} data-transition-token={ctx?.token ?? 0} />
      <AnimatePresence>
        {showScrim && (
          <motion.div
            data-card-scrim
            // Below the site header: the nav stays put while the page around the card goes.
            className="fixed inset-x-0 bottom-0 top-[var(--spacing-header-height)] z-[1049] bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* A prototype becoming its header: two layers move together. The band (the
          design's canvas colour) grows from the preview out to full width, and the
          design glides into its fitted place inside it. Nothing is swapped. */}
      <AnimatePresence>
        {!reduced && cardRect?.keep && frame && (opening || closing) && cardBox && (
          <motion.div key={`keep-${phase === 'closing' ? 'close' : 'open'}-${ctx?.token}`} data-card-morph={closing ? 'closing' : 'opening'} className="pointer-events-none" exit={{ opacity: 0, transition: { duration: closing ? 0.25 : 0 } }}>
            <motion.div data-card-band className="fixed z-[1050]" style={{ background: cardRect.keep.band }} initial={closing ? { ...frame.band } : cardBox} animate={closing ? cardBox : { ...frame.band }} transition={{ duration: CARD_MORPH_MS / 1000, ease }} />
            <motion.div data-card-design className="fixed z-[1051]" initial={closing ? { ...frame.design } : cardBox} animate={closing ? cardBox : { ...frame.design }} transition={{ duration: CARD_MORPH_MS / 1000, ease }} onAnimationComplete={() => { if (closing) ctx?.finishReturn() }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- the same bytes the case study draws */}
              <img src={cardRect.image} alt="" className="block h-full w-full" />
              {cardRect.fromImage && (
                // A work-grid photo: it fades into the design while the card moves.
                <motion.div className="absolute inset-0 overflow-hidden" initial={{ opacity: closing ? 0 : 1 }} animate={{ opacity: closing ? 1 : 0 }} transition={{ duration: 0.35, delay: closing ? 0.15 : 0.05, ease }}>
                  <Image src={cardRect.fromImage} alt="" fill className="object-cover" style={{ objectPosition: 'center top' }} sizes="50vw" />
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Any other card (a work-grid photo) grows into the full-width hero strip. */}
      <AnimatePresence>
        {!reduced && cardRect && !cardRect.keep && (opening || closing) && cardBox && (
          <motion.div
            key={`${phase === 'closing' ? 'close' : 'open'}-${ctx?.token}`}
            data-card-morph={closing ? 'closing' : 'opening'}
            className="pointer-events-none fixed z-[1050] overflow-hidden bg-white"
            initial={closing ? heroBox : cardBox}
            animate={closing ? { ...cardBox, transition: { duration: 0.55, ease } } : heroBox}
            exit={{ opacity: 0, transition: { duration: closing ? 0.25 : 0 } }}
            transition={{ duration: CARD_MORPH_MS / 1000, ease }}
            onAnimationComplete={() => { if (closing) ctx?.finishReturn() }}
          >
            <motion.div className="absolute inset-0" initial={{ opacity: closing ? 1 : cardRect.fromImage ? 0 : 1 }} animate={{ opacity: closing && cardRect.fromImage ? 0 : 1 }} transition={{ duration: 0.45, delay: closing ? 0 : 0.1, ease }}>
              <Image src={cardRect.image} alt="" fill className="object-cover" style={{ objectPosition: 'center top' }} sizes="100vw" quality={95} />
            </motion.div>
            {cardRect.fromImage && (
              <motion.div className="absolute inset-0" initial={{ opacity: closing ? 0 : 1 }} animate={{ opacity: closing ? 1 : 0 }} transition={{ duration: 0.45, delay: closing ? 0.1 : 0.05, ease }}>
                <Image src={cardRect.fromImage} alt="" fill unoptimized className="object-cover" style={{ objectPosition: 'center top' }} sizes="100vw" />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
