'use client'

import { createContext, useContext, useState, useCallback, useEffect, useReducer, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useReducedMotion } from '@/lib/motion'

export interface CardRect {
  top: number
  left: number
  width: number
  height: number
  image: string
  href: string
  /** What the clicked thing looked like, cross-faded into `image` as it grows.
   * Lets a preview (not just a card photo) become the case study's header. */
  fromImage?: string
  /** The clicked image IS the header: it moves into a frame at its own proportions
   * (caseHeaderFrame) and stays there; the case study draws it in the same place
   * and grows in below. Nothing is swapped or cropped. */
  keep?: { aspect: number; band: string }
}

export interface MorphRect {
  top: number
  left: number
  width: number
  height: number
}

export interface SectionMorph {
  bgRect: MorphRect
  bgImage: string
  bgPosition: string
  cardRect: MorphRect
  href: string
  targetBgRect: MorphRect
  targetCardRect: MorphRect
}

/* ------------------------------------------------------------------ */
/*  The card transition, as a state machine                            */
/* ------------------------------------------------------------------ */

/**
 * idle ──START──▶ collapsing ──NAVIGATED──▶ navigating ──ARRIVED──▶ open ──SETTLED──▶ idle
 *   ▲                 │                         │                                    │
 *   └────CANCEL───────┴─────────CANCEL──────────┘                                    │
 * idle ──RETURN (Back to where the card was)──▶ closing ──RETURNED──▶ idle ◀──────────┘
 *
 * collapsing: the old page folds away while the card grows into the hero.
 * navigating: the route change has been asked for; waiting for the pathname.
 * open:       the case study is revealing under the hero.
 * closing:    Back from that case study: the hero shrinks into the card it came from.
 *
 * Every timed step carries the token of the run that scheduled it; a step from
 * an older run (a second click, a Back press mid-morph) is ignored, so stale
 * work can never act. Any event a phase does not accept is a no-op.
 */
export type TransitionPhase = 'idle' | 'collapsing' | 'navigating' | 'open' | 'closing'

export interface TransitionState {
  phase: TransitionPhase
  token: number
  card: CardRect | null
  /** Where the page the card was on was scrolled; Back restores it. */
  scrollY: number
  /** The last card-opened case study, remembered so Back can reverse it. */
  last: { origin: string; card: CardRect; scrollY: number } | null
}

export type TransitionEvent =
  | { type: 'START'; card: CardRect; origin: string; scrollY?: number }
  | { type: 'NAVIGATED'; token: number }
  | { type: 'ARRIVED'; token: number }
  | { type: 'SETTLED'; token: number }
  | { type: 'CANCEL' }
  | { type: 'RETURN' }
  | { type: 'RETURNED'; token: number }
  | { type: 'CLEAR' }

export const initialTransitionState: TransitionState = { phase: 'idle', token: 0, card: null, scrollY: 0, last: null }

export function transitionReducer(state: TransitionState, event: TransitionEvent): TransitionState {
  const current = 'token' in event && event.token !== state.token ? null : event
  if (!current) return state
  switch (current.type) {
    case 'START':
      if (state.phase !== 'idle') return state
      return { phase: 'collapsing', token: state.token + 1, card: current.card, scrollY: current.scrollY ?? 0, last: { origin: current.origin, card: current.card, scrollY: current.scrollY ?? 0 } }
    case 'NAVIGATED':
      return state.phase === 'collapsing' ? { ...state, phase: 'navigating' } : state
    case 'ARRIVED':
      return state.phase === 'navigating' ? { ...state, phase: 'open' } : state
    case 'SETTLED':
      return state.phase === 'open' ? { ...state, phase: 'idle', card: null } : state
    case 'CANCEL':
      return state.phase === 'collapsing' || state.phase === 'navigating'
        ? { phase: 'idle', token: state.token + 1, card: null, scrollY: 0, last: null }
        : state
    case 'RETURN':
      if (state.phase !== 'idle' || !state.last) return state
      return { phase: 'closing', token: state.token + 1, card: state.last.card, scrollY: state.last.scrollY, last: null }
    case 'RETURNED':
      return state.phase === 'closing' ? { ...state, phase: 'idle', card: null } : state
    case 'CLEAR':
      return { ...state, phase: 'idle', card: null, last: null }
  }
}

/** How long the card takes to become the hero before the route changes. */
export const CARD_MORPH_MS = 550

interface PageTransitionValue {
  phase: TransitionPhase
  token: number
  cardRect: CardRect | null
  triggerCardTransition: (rect: CardRect) => void
  /** The closing morph has landed on its card. */
  finishReturn: () => void
  /** The case study finished revealing under the hero. */
  settle: () => void
  sectionMorph: SectionMorph | null
  triggerSectionMorph: (morph: SectionMorph) => void
  clearTransition: () => void
}

const PageTransitionContext = createContext<PageTransitionValue | null>(null)

const path = (href: string) => href.split('?')[0].split('#')[0]

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const [state, rawDispatch] = useReducer(transitionReducer, initialTransitionState)
  // Development only: a short log of every event the machine receives, read by
  // scripts/verify-card-transitions.mjs when a scenario fails.
  const dispatch = useCallback((event: TransitionEvent) => {
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      const log = ((window as unknown as { __transitionLog?: string[] }).__transitionLog ??= [])
      log.push(`${Math.round(performance.now())} ${event.type}${'token' in event ? '#' + event.token : ''} @${location.pathname}`)
      if (log.length > 60) log.shift()
    }
    rawDispatch(event)
  }, [])
  const [sectionMorph, setSectionMorph] = useState<SectionMorph | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const reduced = useReducedMotion()
  const previousPath = useRef(pathname)
  const popped = useRef(false)

  const triggerCardTransition = useCallback((rect: CardRect) => {
    dispatch({ type: 'START', card: rect, origin: pathname, scrollY: window.scrollY })
  }, [pathname, dispatch])
  // Listeners outside React's render read the machine through this.
  const live = useRef(state)
  live.current = state

  // collapsing → navigating: once the card has grown into the hero, change route.
  // Scrolling to the top first is invisible (the old page has folded away under
  // the overlay) and lines the new page's hero up with the overlay.
  useEffect(() => {
    if (state.phase !== 'collapsing' || !state.card) return
    const { token, card } = state
    const timer = window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' })
      router.push(card.href, { scroll: false })
      dispatch({ type: 'NAVIGATED', token })
    }, reduced ? 0 : CARD_MORPH_MS)
    return () => window.clearTimeout(timer)
  }, [state, router, reduced, dispatch])

  // open → idle normally happens when the case study's reveal reports it finished
  // (TransitionLayout's onAnimationComplete). That callback can be held up for good
  // (frames stop in a background tab, an animation is interrupted), which would leave
  // the overlay up and the machine in `open`. A watchdog settles it regardless.
  useEffect(() => {
    if (state.phase !== 'open') return
    const { token } = state
    const timer = window.setTimeout(() => dispatch({ type: 'SETTLED', token }), reduced ? 0 : 1500)
    return () => window.clearTimeout(timer)
  }, [state, reduced, dispatch])

  // Back/Forward is a fact about the history, not a request: note it so the
  // pathname effect can tell it from a navigation the machine asked for.
  // A Back press mid-morph cancels it even when the path does not change (a
  // same-page history entry): the reader asked to go back, not to be carried on.
  useEffect(() => {
    const onPop = () => {
      popped.current = true
      if (live.current.phase === 'collapsing' || live.current.phase === 'navigating') dispatch({ type: 'CANCEL' })
    }
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [dispatch])

  // A link followed mid-morph (keyboard, or a click the scrim did not cover) is
  // the newer request: cancel, so the morph's own route change cannot win the race.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const { phase, card } = live.current
      if ((phase !== 'collapsing' && phase !== 'navigating') || !card) return
      const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!link || event.defaultPrevented) return
      const to = new URL(link.href, location.href)
      if (to.origin === location.origin && path(to.pathname) === path(card.href)) return
      dispatch({ type: 'CANCEL' })
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [dispatch])

  // Arriving: move focus to the case study's heading (a screen reader announces
  // where it landed). Returning: put the page back where it was scrolled, before
  // the hero shrinks into its card, then give focus back to the link that opened it.
  const previous = useRef(state)
  useEffect(() => {
    const before = previous.current
    previous.current = state
    if (before.phase === 'open' && state.phase === 'idle') {
      const heading = document.querySelector<HTMLElement>('#main-content h1') ?? document.querySelector<HTMLElement>('h1')
      if (heading) { if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }) }
    }
    if (state.phase === 'closing' && before.phase !== 'closing') {
      // Hold the saved position for the length of the reverse morph: the returning
      // page is still growing (and the layout's own scroll-to-top can land after a
      // single scrollTo), so set it once and it slips back to the top.
      const y = state.scrollY
      const until = performance.now() + CARD_MORPH_MS + 250
      const restore = () => {
        if (Math.abs(window.scrollY - y) > 2 && document.documentElement.scrollHeight - innerHeight >= y) window.scrollTo({ top: y, behavior: 'instant' })
        if (performance.now() < until) requestAnimationFrame(restore)
      }
      restore()
    }
    if (before.phase === 'closing' && state.phase === 'idle' && before.card) {
      const href = before.card.href
      const link = [...document.querySelectorAll<HTMLAnchorElement>('#main-content a[href]')].find(a => a.getAttribute('href') === href)
      link?.focus({ preventScroll: true })
    }
  }, [state])

  // The pathname is the source of truth.
  useEffect(() => {
    const from = previousPath.current
    if (from === pathname) return
    previousPath.current = pathname
    const wasPop = popped.current
    popped.current = false
    const target = state.card ? path(state.card.href) : null
    if (state.phase === 'navigating' && pathname === target) { dispatch({ type: 'ARRIVED', token: state.token }); return }
    // Somewhere else while the card was growing (Back mid-morph, a header link):
    // drop the transition rather than reveal the wrong page under the hero.
    if (state.phase === 'collapsing' || state.phase === 'navigating') { dispatch({ type: 'CANCEL' }); return }
    // Back from the case study a card opened, to the page the card was on.
    if (wasPop && state.last && from === path(state.last.card.href) && pathname === state.last.origin && !reduced) {
      dispatch({ type: 'RETURN' })
      return
    }
    if (state.phase === 'open' || state.phase === 'closing') dispatch({ type: 'CLEAR' })
  }, [pathname, state, reduced, dispatch])

  const settle = useCallback(() => dispatch({ type: 'SETTLED', token: state.token }), [state.token, dispatch])
  const finishReturn = useCallback(() => dispatch({ type: 'RETURNED', token: state.token }), [state.token, dispatch])

  const triggerSectionMorph = useCallback((morph: SectionMorph) => {
    setSectionMorph(morph)
  }, [])

  const clearTransition = useCallback(() => {
    dispatch({ type: 'CLEAR' })
    setSectionMorph(null)
  }, [dispatch])

  return (
    <PageTransitionContext.Provider
      value={{ phase: state.phase, token: state.token, cardRect: state.card, triggerCardTransition, finishReturn, settle, sectionMorph, triggerSectionMorph, clearTransition }}
    >
      {children}
    </PageTransitionContext.Provider>
  )
}

export function usePageTransition() {
  return useContext(PageTransitionContext)
}
