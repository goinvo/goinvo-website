'use client'

import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

const control = 'flex h-12 min-w-12 cursor-pointer items-center justify-center bg-transparent text-black hover:bg-tertiary-lightest focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary disabled:cursor-default disabled:opacity-35'

/** The homepage's accessibility settings: low motion and larger body text. (The side rail
 * of page sections, and its phone menu, were removed on 2026-11-13: the page reads top to
 * bottom without them.) */
export function HumanPageControls({ low, ready, toggleMotion, largerText, setLargerText }: {
  low: boolean; ready: boolean; toggleMotion: () => void; largerText: boolean; setLargerText: (value: boolean) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  if (!ready) return null

  // Rendered straight into <body>: inside the page's wrapper, which is its own stacking
  // layer, z-index 70 only ranked within that layer and the footer painted over the
  // button. It only exists after load (ready), so a portal is safe.
  return createPortal(
    <aside data-ui aria-label="Accessibility tools" className="pointer-events-none fixed inset-0 z-[70] text-black">
      {/* Sits above the site's chat widget, which owns the bottom-right corner. */}
      <div className="pointer-events-auto absolute bottom-24 right-0 flex flex-col items-center gap-1 bg-white md:bottom-24 md:right-4 md:flex-row">
        <button className={control} aria-label="Accessibility settings" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="4.5" r="2" /><path d="M4 9h16M12 8v7m0-5-4 10m4-10 4 10" /></svg>
        </button>
      </div>
      <dialog ref={dialog} aria-labelledby="human-access-title" className="pointer-events-auto fixed bottom-40 left-auto right-4 top-auto m-0 max-h-[75dvh] w-[320px] max-w-[calc(100vw-32px)] overflow-auto bg-white p-6 text-black shadow-[0_4px_32px_#24434d33] backdrop:bg-[#24434d20] md:right-6">{/* taste-skill-ignore: a real modal dialog. */}
        <div className="mb-5 flex items-center justify-between gap-4"><h2 id="human-access-title" className="m-0 font-sans text-xl font-normal">Accessibility</h2><button className={control} aria-label="Close accessibility settings" onClick={() => dialog.current?.close()}>×</button></div>
        <button type="button" role="switch" aria-checked={low} disabled={!ready} onClick={toggleMotion} className={cn(control, 'mb-3 w-full justify-between gap-4 px-3 text-base')}><span>Low motion</span><span aria-hidden="true" className={cn('flex h-6 w-10 items-center rounded-full p-1', low ? 'bg-secondary' : 'bg-gray-medium')}><span className={cn('h-4 w-4 rounded-full bg-white', low && 'translate-x-4')} /></span></button>
        <label className={cn(control, 'w-full justify-between gap-4 px-3 text-base')}><span>Larger body text</span><input type="checkbox" checked={largerText} onChange={event => setLargerText(event.target.checked)} className="h-5 w-5 accent-secondary" /></label>
      </dialog>
    </aside>,
    document.body,
  )
}
