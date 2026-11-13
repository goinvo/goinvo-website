'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SUBLINES, TAGLINES, type Subline, type Tagline } from '@/components/home-story/taglines'

/**
 * Review only: step through the homepage headline candidates in place. Writes
 * `?headline=` and `?subline=` into the address, so any option can be shared as a link.
 * Never in production (the page it lives on is off there too); `?picker=off` hides it
 * for clean screenshots.
 */
export const taglinePickerEnabled = process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production'

const control = 'flex h-9 min-w-9 cursor-pointer items-center justify-center bg-transparent text-black hover:bg-tertiary-lightest focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary'

export function TaglinePicker({ tagline, subline, choose, placement }: {
  /** `floating` on a desktop, top right; `inline` on a phone, in the page above the
   * headline, because a phone has no corner free of the hero's controls. */
  placement: 'floating' | 'inline'
  tagline: Tagline
  subline: Subline
  /** A null subline goes back to the one the headline was written over. */
  choose: (headline: string, subline: string | null) => void
}) {
  // Starts as its bar: open, the list covered the line under the headline and the
  // choices, the very things being judged. ‹ › steps through them with the hero in view.
  const [open, setOpen] = useState(false)
  const index = TAGLINES.findIndex((item) => item.key === tagline.key)
  const step = (by: number) => choose(TAGLINES[(index + by + TAGLINES.length) % TAGLINES.length].key, null)
  const angles = [...new Set(TAGLINES.map((item) => item.angle))]
  const paired = subline.key === (tagline.pair ?? SUBLINES[0].key)

  return (
    <aside data-ui data-tagline-picker={placement} aria-label="Headline options (review only)" className={cn('bg-white text-black', placement === 'floating' ? 'fixed right-4 top-[calc(var(--spacing-header-height)+12px)] z-[75] w-[340px] shadow-[0_4px_32px_#24434d33] max-md:hidden' : 'relative mb-8 border border-black/15 md:hidden')}>
      <div className="flex items-center gap-1 px-2 py-1">
        <button type="button" className={control} aria-label="Previous headline" onClick={() => step(-1)}>‹</button>
        <p className="m-0 flex-1 truncate px-1 text-center text-[13px] leading-tight">
          <span className="font-semibold">{tagline.angle}</span> · {index + 1} of {TAGLINES.length}
        </p>
        <button type="button" className={control} aria-label="Next headline" onClick={() => step(1)}>›</button>
        <button type="button" className={cn(control, 'px-2 text-[13px]')} aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? 'Hide' : 'All'}</button>
      </div>
      <p className="m-0 border-b border-black/10 px-4 pb-2.5 text-[13px] leading-snug text-gray" data-tagline-note>{tagline.note}</p>
      {/* Floating top right, it sits over a corner of the preview (one big link), clear of the
          hero's controls; bottom left, it sat on the Ipsos view links and swallowed the press. */}
      {open && (
        <div className="max-h-[min(60vh,520px)] overflow-y-auto px-4 pb-4 pt-3 max-md:max-h-[45vh]">
          <label className="block text-[12px] leading-tight text-gray">
            Line under it
            <select
              value={paired ? '' : subline.key}
              onChange={(event) => choose(tagline.key, event.target.value || null)}
              className="mt-1 block w-full cursor-pointer border border-black/20 bg-white px-2 py-1.5 text-[13px] text-black"
            >
              <option value="">Paired ({(SUBLINES.find((item) => item.key === tagline.pair) ?? SUBLINES[0]).label})</option>
              {SUBLINES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          </label>
          {angles.map((angle) => (
            <div key={angle} className="mt-4">
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
                        className={cn('block w-full cursor-pointer border-l-2 bg-transparent px-2 py-1.5 text-left font-serif text-[16px] leading-snug text-black hover:bg-tertiary-lightest', on ? 'border-secondary bg-tertiary-lightest' : 'border-transparent')}
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
      )}
    </aside>
  )
}
