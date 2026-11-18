'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HeadlineDirections, HeadlineOptions } from '@/components/home-story/TaglinePicker'
import { useHeadlineControl } from '@/components/review/headlineBridge'
import { cn } from '@/lib/utils'
import { HAND_FONTS, HAND_LEVELS, REVIEW_COOKIES, setReviewCookie, type HandFont, type HandLevel } from '@/lib/designSwitch'

/**
 * The filter design-hand.css uses to roughen lines (`filter: url(#hand-rough)`): the
 * prototype's connector arrows and the like wobble as if drawn with a pen. Rendered once,
 * only where the review switches are enabled.
 */
export function HandFilters() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="pointer-events-none absolute">
      <filter id="hand-rough" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7" />
        <feDisplacementMap in="SourceGraphic" scale="3.5" />
      </filter>
    </svg>
  )
}

type State = { design: 'classic' | 'human'; hand: 'off' | HandLevel; font: HandFont }

/** Every page that has a new design, so a reviewer never edits an address. */
export const REVIEW_PAGES = [
  { href: '/design-lab/human', label: 'Homepage' },
  { href: '/services', label: 'Services' },
  { href: '/contact', label: 'Contact' },
] as const

function read(): State {
  const html = document.documentElement
  return {
    design: html.dataset.design === 'human' ? 'human' : 'classic',
    hand: (HAND_LEVELS as readonly string[]).includes(html.dataset.hand ?? '') ? (html.dataset.hand as HandLevel) : 'off',
    font: (HAND_FONTS.find((f) => f.key === html.dataset.handFont)?.key ?? 'caveat') as HandFont,
  }
}

/**
 * The ONE review panel: the pages to look at, the design options, and (on the homepage
 * study) the headline candidates. It changes the same cookies, <html> attributes and
 * address parameters a shared link carries, live.
 *
 * It appears once a review option is in use (a shared link carries one), with ?review=1,
 * or on a page that publishes headline choices; `?picker=off` hides it for clean
 * screenshots. So the classic site looks exactly as before.
 *
 * Where it sits: top right under the header on a desktop, the one corner clear of the
 * homepage hero's controls (bottom left it sat on the Ipsos view links and swallowed the
 * press); bottom left on a phone, lifted clear of the chat teaser.
 */
export function ReviewSwitches() {
  const pathname = usePathname()
  const headline = useHeadlineControl()
  const [state, setState] = useState<State | null>(null)
  const [asked, setAsked] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setState(read())
    setAsked(params.get('review') === '1')
    setHidden(params.get('picker') === 'off')
    // Starts folded to one small bar: open, it covered the homepage's challenge
    // choices at 1440 × 900. It remembers being opened for the rest of the visit.
    let saved: string | null = null
    try { saved = sessionStorage.getItem('goinvo-review-panel') } catch { /* Optional storage. */ }
    setOpen(saved === 'open')
  }, [])

  const inUse = state && (asked || headline || state.design === 'human' || state.hand !== 'off')
  if (!state || !inUse || hidden || pathname.startsWith('/studio')) return null

  const html = document.documentElement
  function apply(next: State) {
    setReviewCookie(REVIEW_COOKIES.design, next.design === 'human' ? 'human' : '')
    setReviewCookie(REVIEW_COOKIES.hand, next.hand === 'off' ? '' : next.hand)
    setReviewCookie(REVIEW_COOKIES.handFont, next.font)
    if (next.design === 'human') html.dataset.design = 'human'; else delete html.dataset.design
    if (next.hand === 'off') delete html.dataset.hand; else html.dataset.hand = next.hand
    html.dataset.handFont = next.font
    setState(next)
    // A page that reviewed a design keeps the panel even after switching back to Classic.
    setAsked(true)
  }
  function toggle(value: boolean) {
    setOpen(value)
    try { sessionStorage.setItem('goinvo-review-panel', value ? 'open' : 'closed') } catch { /* Optional storage. */ }
  }
  /** This page exactly as it is being looked at: the options go into the address. */
  async function copyLink(current: State) {
    const url = new URL(location.href)
    url.searchParams.set('design', current.design)
    url.searchParams.set('hand', current.hand)
    if (current.hand !== 'off') url.searchParams.set('hand-font', current.font)
    try { await navigator.clipboard.writeText(url.toString()); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* No clipboard: the address bar still has the page. */ }
  }

  const legend = 'mb-1 p-0 text-[12px] font-semibold'
  const options = <T extends string>(name: string, title: string, value: T, choices: readonly { key: T; label: string }[], change: (key: T) => void, disabled = false) => (
    <fieldset disabled={disabled} className="m-0 min-w-0 border-0 p-0 disabled:opacity-40">
      <legend className={legend}>{title}</legend>
      <div className="flex flex-wrap gap-1">
        {choices.map((choice) => (
          <label key={choice.key} className="cursor-pointer">
            <input type="radio" name={name} value={choice.key} checked={value === choice.key} onChange={() => change(choice.key)} className="peer sr-only" />
            <span className="block border border-black/20 px-2 py-1 text-[13px] leading-tight peer-checked:border-black peer-checked:bg-black peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">{choice.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )

  return (
    <aside data-review-ui data-ui aria-label="Design review options" className={cn('fixed bottom-20 left-4 z-[80] bg-white font-sans text-black shadow-[0_4px_28px_#24434d33] md:bottom-auto md:left-auto md:right-4 md:top-[calc(var(--spacing-header-height)+12px)]', open || headline ? 'w-[min(340px,calc(100vw-5rem))]' : '')}>
      {/* The bar is always there: open or folded, the headline direction can be changed with the hero in view. */}
      <div data-review-bar className="flex items-center gap-1 px-1 py-1">
        <button type="button" data-review-toggle aria-expanded={open} onClick={() => toggle(!open)} className="min-h-9 cursor-pointer border-0 bg-transparent px-2 text-[13px] font-semibold text-black">{open ? 'Hide review' : 'Review'}</button>
        {headline && <HeadlineDirections tagline={headline.tagline} choose={headline.choose} />}
      </div>
      {open && (
        <div data-review-panel className="flex max-h-[calc(100svh-var(--spacing-header-height)-140px)] flex-col gap-4 overflow-y-auto border-t border-black/10 p-3 max-md:max-h-[55svh]">
          <nav aria-label="Pages to review">
            <p className={cn('m-0', legend)}>Pages</p>
            <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
              {REVIEW_PAGES.map((page) => {
                const here = pathname === page.href
                return <li key={page.href}><Link href={page.href} data-review-page={page.href} aria-current={here ? 'page' : undefined} className={cn('block border px-2 py-1 text-[13px] leading-tight no-underline', here ? 'border-black bg-black text-white' : 'border-black/20 text-black hover:border-black')}>{page.label}</Link></li>
              })}
            </ul>
          </nav>
          {options('review-design', 'Design', state.design, [{ key: 'classic', label: 'Classic' }, { key: 'human', label: 'New' }], (design) => apply({ ...state, design }))}
          {options('review-hand', 'Hand-drawn', state.hand, [{ key: 'off', label: 'Off' }, { key: 'accents', label: 'Accents' }, { key: 'full', label: 'Headings too' }], (hand) => apply({ ...state, hand }))}
          {options('review-font', 'Handwriting', state.font, HAND_FONTS.map((f) => ({ key: f.key, label: f.name })), (font) => apply({ ...state, font }), state.hand === 'off')}
          {headline && (
            <div>
              <p className={cn('m-0', legend)}>Headline</p>
              <HeadlineOptions {...headline} />
            </div>
          )}
          <button type="button" data-review-copy onClick={() => copyLink(state)} className="min-h-9 shrink-0 cursor-pointer border border-black/20 bg-white px-2 text-[13px] text-black hover:border-black">{copied ? 'Copied' : 'Copy a link to this view'}</button>
        </div>
      )}
    </aside>
  )
}
