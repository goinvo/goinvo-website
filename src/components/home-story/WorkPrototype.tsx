'use client'

import { useEffect, useRef, useState } from 'react'
import { useMotionValue, useMotionValueEvent, type MotionValue } from 'framer-motion'
import { cn } from '@/lib/utils'
import Image from 'next/image'

export type PrototypeId = 'clinical' | 'prior' | 'facto' | 'flow'
export const prototypeSizes = {
  clinical: { width: 1280, height: 860 },
  prior: { width: 1240, height: 811 },
  facto: { width: 1920, height: 1273 },
  flow: { width: 1920, height: 1080 },
}

/** `live` loads the coded prototype behind a loading bar and shows it whole;
 * `still` shows the finished screen as an image; `pending` is before we know. */
export type PrototypeDelivery = 'pending' | 'live' | 'still'

type NetworkInformation = { effectiveType?: string; saveData?: boolean }

/** A live prototype is 80–170 KB of HTML plus web fonts and dozens of SVGs. On a
 * slow or data-saving connection the still image is the better page. Browsers
 * without the Network Information API (Safari, Firefox) get the live one, and a
 * load that stalls falls back to the still anyway. `?connection=slow|fast`
 * forces either, for review. */
export function chooseDelivery(): 'live' | 'still' {
  const forced = new URLSearchParams(location.search).get('connection')
  if (forced === 'slow') return 'still'
  if (forced === 'fast') return 'live'
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection
  if (!connection) return 'live'
  if (connection.saveData) return 'still'
  // Not `downlink`: Chrome's estimate drifts around 1–2 Mbps on an ordinary
  // connection, so a threshold there sent healthy 4G visitors the still at random.
  if (connection.effectiveType && connection.effectiveType !== '4g') return 'still'
  return 'live'
}

/** How long a live prototype may take before the still image replaces it. */
const stallMs = 12000

/** The frame contains the actual HTML UI, with addressable component layers.
 * Its own stylesheet preserves each project's fonts and design tokens. */
export function WorkPrototype({ id, spread = 0, progress, low = false, className, label, delivery = 'live', onStall }: {
  id: PrototypeId; spread?: number; progress?: MotionValue<number>; low?: boolean; className?: string; label: string
  delivery?: PrototypeDelivery; onStall?: () => void
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(0)
  const [mounted, setMounted] = useState(false)
  const host = useRef<HTMLDivElement>(null)
  const fixedSpread = useMotionValue(spread)
  const dimensions = prototypeSizes[id]
  const padding = 180
  const width = dimensions.width + padding * 2
  const height = dimensions.height + padding * 2
  const current = () => low ? 0 : progress ? progress.get() : spread
  // At rest the page fills the box; opening it shrinks it inside its padding.
  const fitFor = (value: number) => {
    const open = Math.min(size.width / width, size.height / height)
    const closed = Math.min(size.width / dimensions.width, size.height / dimensions.height)
    return open + (closed - open) * (1 - value)
  }

  function send(value: number) {
    if (progress && frame.current && size.width && size.height) {
      const fit = fitFor(value)
      frame.current.style.transform = `scale(${fit})`
      frame.current.style.left = `${(size.width - width * fit) / 2}px`
      frame.current.style.top = `${(size.height - height * fit) / 2}px`
    }
    frame.current?.contentWindow?.postMessage({ type: 'goinvo-prototype-spread', value, immediate: !!progress || low }, location.origin)
  }
  useMotionValueEvent(progress || fixedSpread, 'change', value => send(low ? 0 : value))
  useEffect(() => { send(current()) }, [spread, low, id, progress, size.width, size.height, loaded]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setMounted(true), [])

  // Nothing of the live page shows until all of it is there: the document, every
  // image decoded and every web font loaded. Until then a loading bar reports how
  // far it has got, so a reader never sees placeholder text or a half-sized frame.
  useEffect(() => {
    if (delivery !== 'live') return
    let cancelled = false
    let timer = 0
    const started = performance.now()
    const tick = async () => {
      const doc = frame.current?.contentDocument
      let value = 0.05
      if (doc && doc.readyState !== 'loading' && doc.getElementById('prototype-root')) {
        const images = [...doc.images]
        value = 0.15 + 0.75 * (images.length ? images.filter(image => image.complete).length / images.length : 1)
        if (doc.readyState === 'complete') {
          await doc.fonts.ready
          await Promise.all(images.map(image => image.decode().catch(() => undefined)))
          if (cancelled) return
          setLoading(1)
          setLoaded(true)
          return
        }
      }
      if (cancelled) return
      setLoading(previous => Math.max(previous, value))
      if (performance.now() - started > stallMs) { onStall?.(); return }
      timer = window.setTimeout(tick, 120)
    }
    tick()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [delivery, id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const element = host.current
    if (!element) return
    const observer = new ResizeObserver(entries => setSize({ width: entries[0].contentRect.width, height: entries[0].contentRect.height }))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const fit = size.width && size.height ? fitFor(current()) : 0
  const still = `/design-lab/human/assets/${id}-assembled.png`
  return <div ref={host} data-ui data-work-prototype={id} data-delivery={delivery} data-ready={loaded} role="img" aria-label={label} className={cn('relative w-full overflow-hidden', className)} style={{ aspectRatio: `${width}/${height}` }}>
    {delivery === 'still' && <Image src={still} alt="" unoptimized fill sizes="(max-width:767px) 90vw, 60vw" className="object-contain" />}
    {/* Without script there is no loading bar to watch: show the still. Only on
        the server render, so a client remount never creates the image. */}
    {/* eslint-disable-next-line @next/next/no-img-element -- next/image needs script; this is the no-script fallback. */}
    {!mounted && <noscript><img src={still} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} /></noscript>}
    {delivery !== 'still' && !loaded && <div data-prototype-loading aria-hidden="true" className="absolute inset-x-0 top-1/2 mx-auto w-[min(240px,60%)] -translate-y-1/2">
      <p className="mb-3 mt-0 text-center text-sm leading-snug">Loading the prototype</p>
      <div className="h-[2px] w-full bg-black/15"><div className="h-full w-full origin-left bg-current transition-transform duration-200 motion-reduce:transition-none" style={{ transform: `scaleX(${loading})` }} /></div>
    </div>}
    {delivery === 'live' && <iframe ref={frame} src={`/design-lab/human/assets/${id}.html`} title={label} aria-hidden="true" tabIndex={-1} className="pointer-events-none absolute origin-top-left border-0" width={width} height={height} style={{ width, height, opacity: loaded ? 1 : 0, left: (size.width - width * fit) / 2, top: (size.height - height * fit) / 2, transform: `scale(${fit})` }} />}
  </div>
}
