'use client'

import { cn } from '@/lib/utils'
import { SUBLINES, TAGLINES } from '@/components/home-story/taglines'
import type { HeadlineControl } from '@/components/review/headlineBridge'

/**
 * Review only: the homepage headline directions, as parts of the one review panel
 * (src/components/review/ReviewSwitches.tsx). Choosing writes `?headline=` and `?subline=`
 * into the address, so any option can be shared as a link. Never in production (the page
 * it belongs to is off there too); `?picker=off` hides the whole panel for clean screenshots.
 */
export const taglinePickerEnabled = process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production'

/** The directions being weighed, one press each: it sits in the panel's bar, so the
 * headline can be changed with the hero in view and the panel folded. */
export function HeadlineDirections({ tagline, choose }: Pick<HeadlineControl, 'tagline' | 'choose'>) {
  return (
    <div role="group" aria-label="Headline direction" data-headline-directions className="flex min-w-0 flex-1 flex-wrap justify-end gap-1">
      {TAGLINES.map((item) => {
        const on = item.key === tagline.key
        return <button key={item.key} type="button" data-direction={item.key} aria-pressed={on} title={item.text} onClick={() => choose(item.key, null)} className={cn('min-h-8 cursor-pointer border px-2 text-[13px] leading-tight', on ? 'border-black bg-black text-white' : 'border-black/20 bg-white text-black hover:border-black')}>{item.angle}</button>
      })}
    </div>
  )
}

/** What the current headline is selling, and the line under it. */
export function HeadlineOptions({ tagline, subline, choose }: HeadlineControl) {
  const paired = subline.key === (tagline.pair ?? SUBLINES[0].key)
  return (
    <div data-headline-options>
      <p className="m-0 font-serif text-[18px] leading-snug text-black" data-tagline-text>{tagline.text}</p>
      <p className="m-0 mt-1 text-[13px] leading-snug text-gray" data-tagline-note>{tagline.note}</p>
      <label className="mt-3 block text-[12px] leading-tight text-gray">
        Line under it
        <select
          data-headline-subline
          value={paired ? '' : subline.key}
          onChange={(event) => choose(tagline.key, event.target.value || null)}
          className="mt-1 block w-full cursor-pointer border border-black/20 bg-white px-2 py-1.5 text-[13px] text-black"
        >
          <option value="">Paired ({(SUBLINES.find((item) => item.key === tagline.pair) ?? SUBLINES[0]).label})</option>
          {SUBLINES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
        </select>
      </label>
    </div>
  )
}
