'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
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

function read(): State {
  const html = document.documentElement
  return {
    design: html.dataset.design === 'human' ? 'human' : 'classic',
    hand: (HAND_LEVELS as readonly string[]).includes(html.dataset.hand ?? '') ? (html.dataset.hand as HandLevel) : 'off',
    font: (HAND_FONTS.find((f) => f.key === html.dataset.handFont)?.key ?? 'caveat') as HandFont,
  }
}

/**
 * A small panel for comparing the review options on any page without editing the
 * address. It changes the same cookies and <html> attributes as the URL parameters,
 * live (every option is CSS). It appears once a review option is in use (a shared link
 * carries one), or with ?review=1, so the classic site looks exactly as before.
 */
export function ReviewSwitches() {
  const pathname = usePathname()
  const [state, setState] = useState<State | null>(null)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    const now = read()
    const asked = new URLSearchParams(location.search).get('review') === '1'
    if (asked || now.design === 'human' || now.hand !== 'off') setState(now)
    // Starts folded on a phone, where the open panel would cover the page being judged.
    let saved: string | null = null
    try { saved = sessionStorage.getItem('goinvo-review-panel') } catch { /* Optional storage. */ }
    setOpen(saved ? saved === 'open' : innerWidth >= 768)
  }, [])

  if (!state || pathname.startsWith('/studio')) return null

  const html = document.documentElement
  function apply(next: State) {
    setReviewCookie(REVIEW_COOKIES.design, next.design === 'human' ? 'human' : '')
    setReviewCookie(REVIEW_COOKIES.hand, next.hand === 'off' ? '' : next.hand)
    setReviewCookie(REVIEW_COOKIES.handFont, next.font)
    if (next.design === 'human') html.dataset.design = 'human'; else delete html.dataset.design
    if (next.hand === 'off') delete html.dataset.hand; else html.dataset.hand = next.hand
    html.dataset.handFont = next.font
    setState(next)
  }
  function toggle(value: boolean) {
    setOpen(value)
    try { sessionStorage.setItem('goinvo-review-panel', value ? 'open' : 'closed') } catch { /* Optional storage. */ }
  }

  const options = <T extends string>(name: string, legend: string, value: T, choices: readonly { key: T; label: string }[], change: (key: T) => void, disabled = false) => (
    <fieldset disabled={disabled} className="m-0 min-w-0 border-0 p-0 disabled:opacity-40">
      <legend className="mb-1 p-0 text-[12px] font-semibold">{legend}</legend>
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
    <aside data-review-ui aria-label="Design review options" className="fixed bottom-4 left-4 z-[80] font-sans text-black">
      {open ? (
        <div className="flex w-[260px] flex-col gap-3 bg-white p-3 shadow-[0_4px_28px_#24434d33]">
          <div className="flex items-center justify-between">
            <p className="m-0 text-[13px] font-semibold">Compare designs</p>
            <button type="button" onClick={() => toggle(false)} aria-label="Hide design options" className="min-h-8 min-w-8 cursor-pointer border-0 bg-transparent text-[18px] leading-none">×</button>
          </div>
          {options('review-design', 'Design', state.design, [{ key: 'classic', label: 'Classic' }, { key: 'human', label: 'New' }], (design) => apply({ ...state, design }))}
          {options('review-hand', 'Hand-drawn', state.hand, [{ key: 'off', label: 'Off' }, { key: 'accents', label: 'Accents' }, { key: 'full', label: 'Headings too' }], (hand) => apply({ ...state, hand }))}
          {options('review-font', 'Handwriting', state.font, HAND_FONTS.map((f) => ({ key: f.key, label: f.name })), (font) => apply({ ...state, font }), state.hand === 'off')}
        </div>
      ) : (
        <button type="button" onClick={() => toggle(true)} className="min-h-10 cursor-pointer border-0 bg-white px-3 text-[13px] font-semibold shadow-[0_4px_28px_#24434d33]">Compare designs</button>
      )}
    </aside>
  )
}
