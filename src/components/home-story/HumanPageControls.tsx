'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

const chapters = [
  { id: 'human', label: 'Introduction' },
  { id: 'work-result', label: 'Our solutions' },
  { id: 'ask', label: 'Ask about our work' },
  { id: 'services', label: 'What we do' },
  { id: 'proof', label: 'Experience and trust' },
  { id: 'evidence', label: 'Work at scale' },
  { id: 'contact', label: 'Contact' },
]
/** The rail's box in the window: centred, 48% of the height, until the footer comes up.
 * Then it shortens so it always ends above the footer (every dot stays on it, closer
 * together), and below RAIL_MIN it slides up instead. */
const RAIL_MIN = 160
const RAIL_GAP = 32
export function railBox(viewportHeight: number, footerTop: number) {
  const top = viewportHeight * 0.26
  const floor = Math.min(top + viewportHeight * 0.48, footerTop - RAIL_GAP)
  const height = Math.max(RAIL_MIN, floor - top)
  return { top: Math.min(top, floor - height), height }
}
/** Each item's stretch of the rail, in percent: from the midpoint with the dot above to the
 * midpoint with the dot below, at most `reach` either side. Sections that sit close together
 * (and a rail shortened above the footer) put dots under 48px apart; equal fixed targets then
 * overlapped, and pointing at a dot picked its neighbour. */
export function railTargets(positions: number[], reach: number) {
  return positions.map((at, index) => {
    const start = index === 0 ? at - reach : Math.max(at - reach, (at + positions[index - 1]) / 2)
    const end = index === positions.length - 1 ? at + reach : Math.min(at + reach, (at + positions[index + 1]) / 2)
    return { start, end }
  })
}

/** Where each dark band crosses the rail, as [start, end] percent of the rail's height. */
export function railBands(rail: { top: number; height: number }, bands: { top: number; bottom: number }[]) {
  const pct = (y: number) => Math.max(0, Math.min(100, (y - rail.top) / rail.height * 100))
  return bands.map(band => ({ start: pct(band.top), end: pct(band.bottom) })).filter(band => band.end - band.start > 0.1)
}

/** The rail's drawing: track, progress and dots, in ink or (over a dark band) light. The
 * buttons that navigate sit above both and carry the labels. */
function RailInk({ tone, percent, positions, chapter, target, clip }: { tone: 'ink' | 'light'; percent: number; positions: number[]; chapter: number; target: number | null; clip?: { start: number; end: number } }) {
  const light = tone === 'light'
  return <div aria-hidden="true" data-rail-ink={tone} style={clip ? { clipPath: `inset(${clip.start}% -40px ${100 - clip.end}% -40px)` } : undefined} className={cn('pointer-events-none absolute inset-0', light ? 'text-white' : 'text-black')}>
    <div className={cn('absolute bottom-0 left-1/2 top-0 w-[2px] -translate-x-1/2 bg-current', light ? 'opacity-35' : 'opacity-20')} />
    <div style={{ transform: `scaleY(${percent / 100})` }} className="absolute bottom-0 left-1/2 top-0 w-[2px] origin-top -translate-x-1/2 bg-current" />
    {positions.map((top, index) => {
      const aimed = target === index, current = chapter === index
      return <span key={index} data-rail-dot={index} style={{ top: `${top}%` }} className={cn('absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[width,height,background-color,box-shadow] duration-200 motion-reduce:transition-none',
        aimed ? cn('h-3 w-3', light ? 'bg-[#8fd0d8]' : 'bg-secondary')
          : current ? cn('h-2.5 w-2.5', light ? 'bg-white shadow-[0_0_0_3px_#24434d,0_0_0_4px_white]' : 'bg-secondary shadow-[0_0_0_3px_white,0_0_0_4px_var(--color-secondary)]')
          : 'h-1 w-1 bg-current')} />
    })}
  </div>
}

const control = 'flex h-12 min-w-12 cursor-pointer items-center justify-center bg-transparent text-black hover:bg-tertiary-lightest focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary disabled:cursor-default disabled:opacity-35'

export function HumanPageControls({ low, ready, toggleMotion, largerText, setLargerText }: {
  low: boolean; ready: boolean; toggleMotion: () => void; largerText: boolean; setLargerText: (value: boolean) => void
}) {
  const [reading, setReading] = useState({ percent: 0, chapter: 0, positions: chapters.map((_, index) => index / (chapters.length - 1) * 100), rail: null as { top: number; height: number } | null, bands: [] as { start: number; end: number }[] })
  // The rail item under the pointer or keyboard focus: its dot and label come forward.
  const [target, setTarget] = useState<number | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const menu = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - innerHeight
      let current = 0
      chapters.forEach((chapter, index) => {
        const el = document.getElementById(chapter.id)
        if (el && el.getBoundingClientRect().top <= innerHeight * 0.38) current = index
      })
      if (max > 0 && scrollY >= max - 4) current = chapters.length - 1
      const percent = max > 0 ? Math.round(Math.max(0, Math.min(100, scrollY / max * 100))) : 100
      const positions = chapters.map(chapter => {
        const el = document.getElementById(chapter.id)
        return el && max > 0 ? Math.max(1, Math.min(99, (el.getBoundingClientRect().top + scrollY) / max * 100)) : 0
      })
      const footer = document.querySelector('footer')
      const rail = railBox(innerHeight, footer ? footer.getBoundingClientRect().top : Infinity)
      const bands = railBands(rail, [...document.querySelectorAll('[data-tone="dark"]')].map(band => band.getBoundingClientRect()))
      const sameRail = (a: typeof rail | null) => !!a && Math.abs(a.top - rail.top) < 0.5 && Math.abs(a.height - rail.height) < 0.5
      const sameBands = (a: typeof bands) => a.length === bands.length && a.every((band, index) => Math.abs(band.start - bands[index].start) < 0.05 && Math.abs(band.end - bands[index].end) < 0.05)
      setReading(previous => previous.percent === percent && previous.chapter === current && sameRail(previous.rail) && sameBands(previous.bands) && previous.positions.every((value, index) => Math.abs(value - positions[index]) < 0.05) ? previous : { percent, chapter: current, positions, rail, bands })
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure) }
    measure()
    addEventListener('scroll', schedule, { passive: true })
    addEventListener('resize', schedule)
    const observer = new ResizeObserver(schedule)
    observer.observe(document.body)
    return () => { cancelAnimationFrame(frame); observer.disconnect(); removeEventListener('scroll', schedule); removeEventListener('resize', schedule) }
  }, [low])

  function go(index: number) {
    const target = document.getElementById(chapters[index].id)
    if (!target) return
    if (menu.current) menu.current.open = false
    const heading = chapters[index].id === 'work-result' ? document.getElementById('work-title') : target.querySelector<HTMLElement>('h1,h2')
    heading?.setAttribute('tabindex', '-1')
    heading?.focus({ preventScroll: true })
    target.scrollIntoView({ behavior: low ? 'instant' : 'smooth', block: 'start' })
    history.replaceState(null, '', `#${chapters[index].id}`)
  }

  if (!ready) return null
  const railHeight = reading.rail?.height ?? innerHeight * 0.48
  const targets = railTargets(reading.positions, 24 / railHeight * 100)

  // Rendered straight into <body>: inside the page's wrapper, which is its own stacking
  // layer, z-index 70 only ranked within that layer and the footer painted over the
  // rail and the accessibility button. They only exist after load (ready), so a portal is safe.
  return createPortal(
    <aside data-ui aria-label="Reading and accessibility tools" className="pointer-events-none fixed inset-0 z-[70] text-black">
      <progress aria-label="Page reading progress" value={reading.percent} max={100} className="sr-only" />
      <nav aria-label="Page timeline" data-page-rail style={reading.rail ? { top: reading.rail.top, height: reading.rail.height } : undefined} className="group/rail pointer-events-auto absolute right-3 top-[26vh] hidden h-[48vh] w-12 md:block">
        {/* Ink, and over each dark band a light copy clipped to exactly where the band is. */}
        <RailInk tone="ink" percent={reading.percent} positions={reading.positions} chapter={reading.chapter} target={target} />
        {reading.bands.map((band, index) => <RailInk key={index} tone="light" clip={band} percent={reading.percent} positions={reading.positions} chapter={reading.chapter} target={target} />)}
        {/* Three states, each its own look: the item you are aiming at (dot grows teal, label
            comes forward underlined with an arrow: this navigates), the section you are in
            (ringed teal dot, bold label on a teal edge), and the rest, quieter. */}
        {chapters.map((chapter, index) => {
          const current = reading.chapter === index
          const aimed = target === index
          const hit = targets[index]
          return <button key={chapter.id} data-rail-item={aimed ? 'aimed' : current ? 'current' : 'rest'} aria-label={`Go to ${chapter.label}`} aria-current={current ? 'location' : undefined} onClick={() => go(index)} onPointerEnter={() => setTarget(index)} onPointerLeave={() => setTarget(value => value === index ? null : value)} onFocus={() => setTarget(index)} onBlur={() => setTarget(value => value === index ? null : value)} style={{ top: `${hit.start}%`, height: `${hit.end - hit.start}%` }} className={cn('absolute left-0 w-12 cursor-pointer bg-transparent text-inherit focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-current')}>
            <span aria-hidden="true" data-rail-label style={{ top: `${(reading.positions[index] - hit.start) / (hit.end - hit.start) * 100}%` }} className={cn('pointer-events-none absolute right-11 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap border-l-4 px-4 py-2 text-[18px] leading-snug opacity-0 transition-[opacity,transform,background-color] duration-150 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100 motion-reduce:transition-none', aimed ? '-translate-x-1 border-secondary bg-tertiary-lightest text-black underline decoration-1 underline-offset-4' : current ? 'border-secondary bg-white font-semibold text-black' : 'border-gray-medium bg-white text-gray')}>{chapter.label}{aimed && <span className="no-underline">→</span>}</span>
          </button>
        })}
        <span aria-hidden="true" className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-white px-1 text-xs tabular-nums text-black opacity-0 transition-opacity group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">{reading.percent}%</span>
      </nav>
      {/* Sits above the site's chat widget, which owns the bottom-right corner. */}
      <div className="pointer-events-auto absolute bottom-24 right-0 flex flex-col items-center gap-1 bg-white md:bottom-24 md:right-4 md:flex-row">
        <details ref={menu} className="relative md:hidden">
          <summary aria-label="Page sections" className={cn(control, 'list-none [&::-webkit-details-marker]:hidden')}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 6h14M7 12h14M7 18h14M2 6h1M2 12h1M2 18h1" /></svg></summary>
          <nav aria-label="Jump to section" className="absolute bottom-14 right-0 w-60 bg-white p-2 shadow-[0_4px_28px_#24434d26]">{/* taste-skill-ignore: a floating navigation menu. */}
            <p className="mb-2 mt-1 px-4 text-sm">{reading.percent}% read</p>
            {chapters.map((chapter, index) => <button key={chapter.id} onClick={() => go(index)} aria-current={reading.chapter === index ? 'location' : undefined} className={cn(control, 'w-full justify-between px-4 text-left text-base', reading.chapter === index && 'bg-tertiary-lightest')}><span>{chapter.label}</span>{reading.chapter === index && <span aria-hidden="true">•</span>}</button>)}
          </nav>
        </details>
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

