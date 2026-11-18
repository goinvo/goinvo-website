'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SUBLINES, TAGLINES } from '@/components/home-story/taglines'
import type { HeadlineControl } from '@/components/review/headlineBridge'

/**
 * Review only: the homepage headline candidates, as parts of the one review panel
 * (src/components/review/ReviewSwitches.tsx). Choosing writes `?headline=` and `?subline=`
 * into the address, so any option can be shared as a link. Never in production (the page
 * it belongs to is off there too); `?picker=off` hides the whole panel for clean screenshots.
 */
export const taglinePickerEnabled = process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production'

const control = 'flex h-9 min-w-9 cursor-pointer items-center justify-center border-0 bg-transparent text-black hover:bg-tertiary-lightest focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary'

/** ‹ angle · 3 of 17 ›: steps through the headlines with the hero in view. */
export function HeadlineStepper({ tagline, choose }: Pick<HeadlineControl, 'tagline' | 'choose'>) {
  const index = TAGLINES.findIndex((item) => item.key === tagline.key)
  const step = (by: number) => choose(TAGLINES[(index + by + TAGLINES.length) % TAGLINES.length].key, null)
  return (
    <div data-headline-stepper className="flex min-w-0 flex-1 items-center gap-1">
      <button type="button" className={control} aria-label="Previous headline" onClick={() => step(-1)}>‹</button>
      <p className="m-0 min-w-0 flex-1 truncate px-1 text-center text-[13px] leading-tight">
        <span className="font-semibold">{tagline.angle}</span> · {index + 1} of {TAGLINES.length}
      </p>
      <button type="button" className={control} aria-label="Next headline" onClick={() => step(1)}>›</button>
    </div>
  )
}

/** What the current headline is selling, the line under it, and every candidate. */
export function HeadlineOptions({ tagline, subline, choose }: HeadlineControl) {
  const [all, setAll] = useState(false)
  const angles = [...new Set(TAGLINES.map((item) => item.angle))]
  const paired = subline.key === (tagline.pair ?? SUBLINES[0].key)
  return (
    <div data-headline-options>
      <p className="m-0 text-[13px] leading-snug text-gray" data-tagline-note>{tagline.note}</p>
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
      <button type="button" data-headline-all aria-expanded={all} onClick={() => setAll((value) => !value)} className="mt-3 min-h-8 cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold text-black underline">
        {all ? 'Hide the list' : `All ${TAGLINES.length} headlines`}
      </button>
      {all && angles.map((angle) => (
        <div key={angle} className="mt-3">
          <p className="m-0 mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray">{angle}</p>
          <ul className="m-0 list-none p-0">
            {TAGLINES.filter((item) => item.angle === angle).map((item) => {
              const on = item.key === tagline.key
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    aria-current={on ? 'true' : undefined}
                    data-tagline-option={item.key}
                    onClick={() => choose(item.key, null)}
                    className={cn('block w-full cursor-pointer border-0 border-l-2 bg-transparent px-2 py-1.5 text-left font-serif text-[16px] leading-snug text-black hover:bg-tertiary-lightest', on ? 'border-secondary bg-tertiary-lightest' : 'border-transparent')}
                  >
                    {item.text}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
