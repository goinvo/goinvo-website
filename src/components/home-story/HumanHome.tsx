'use client'

import { sublineFor, taglineFor, type Subline, type Tagline } from '@/components/home-story/taglines'
import { TaglinePicker, taglinePickerEnabled } from '@/components/home-story/TaglinePicker'
import { useEffect, useId, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react'
import { usePageTransition } from '@/context/PageTransitionContext'
import { prototypeHeaderById } from '@/lib/prototypeHeaders'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { animate, AnimatePresence, motion, MotionConfig, useScroll, useTransform, useMotionValue, useMotionValueEvent, type MotionValue } from 'framer-motion'
import { cn } from '@/lib/utils'
import { humanEvidence, humanEvidenceSummary, humanOfferings, humanProof } from './storyContent'
import { HumanPageControls } from './HumanPageControls'
import { WorkPrototype, chooseDelivery, prototypeSizes, type PrototypeDelivery, type PrototypeId } from './WorkPrototype'
import { type } from '@/components/ui/type'
import { Arrow } from '@/components/ui/Arrow'
import { InlineLink, TextLink, focusRing } from '@/components/ui/TextLink'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Reveal } from '@/components/ui/Reveal'
import { DrawnLine } from '@/components/ui/DrawnLine'
import { detailInsight, prototypeScenes, sceneView } from './prototypeContent'
import { ContactFormEmbed } from '@/components/forms/ContactFormEmbed'
import { projectNoteHref } from '@/lib/contactPrefill'
import { HomeSearch } from './HomeSearch'
import { ease } from '@/lib/motion'

const ink = 'var(--color-black)'
const paper = 'var(--color-white)'
const easing = ease.outExpo
const storageKey = 'goinvo-human-home-motion'
const focus = focusRing
const link = `inline-flex min-h-12 items-center gap-4 no-underline ${focus}`

function jumpTo(id: string, low: boolean) {
  const section = document.getElementById(id)
  const heading = id === 'work-result' ? document.getElementById('work-title') : section?.querySelector<HTMLElement>('h1,h2')
  heading?.setAttribute('tabindex', '-1')
  heading?.focus({ preventScroll: true })
  section?.scrollIntoView({ behavior: low ? 'instant' : 'smooth' })
  history.replaceState(null, '', `#${id}`)
}

function emphasizeAnnotation(text: string, phrase: string) {
  const start = text.indexOf(phrase)
  if (start < 0) return text
  return <>{text.slice(0, start)}<em style={{ fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}>{phrase}</em>{text.slice(start + phrase.length)}</>
}

// Headline and subline candidates live in taglines.tsx; TaglinePicker steps through them.
type Headline = Tagline

function Opening({ ready, selected, choose, view, chooseView, progress, live, openingRef, top, spacerRef, gap, headline, subline, review }: { headline: Headline; subline: Subline; review?: ReactNode; low: boolean; ready: boolean; selected: PrototypeId; choose: (id: PrototypeId) => void; view: string | null; chooseView: (id: PrototypeId) => void; progress: MotionValue<number>; live: boolean; openingRef: RefObject<HTMLDivElement | null>; top?: MotionValue<number>; spacerRef: RefObject<HTMLDivElement | null>; gap?: MotionValue<number> }) {
  const opacity = useTransform(progress, value => 1 - Math.min(1, value / 0.4))
  const scene = prototypeScenes.find(item => item.id === selected)
  const current = scene ? sceneView(scene, view).viewId : null
  return <motion.div ref={openingRef} data-opening-copy style={{ opacity: live ? opacity : 1, paddingTop: top }} className="relative z-20 pb-8 pl-5 pr-5 pt-28 md:pl-[6vw] md:pr-[6vw] md:pt-24 min-[1100px]:absolute min-[1100px]:left-0 min-[1100px]:top-0 min-[1100px]:w-[31%] min-[1100px]:pr-8 [@media(min-width:1100px)_and_(max-height:800px)]:pb-6 [@media(min-width:1100px)_and_(max-height:800px)]:pt-[88px]">
    {review}
    <h1 id="human-title" data-headline={headline.key} className={cn('relative m-0 font-serif text-[clamp(2.8rem,14.75vw,3.6rem)] font-normal leading-[0.94] tracking-[-0.05em] md:text-[clamp(3.6rem,7.5vw,9rem)]', headline.fit)}>{headline.node}</h1>
    <p className={cn('mb-0 mt-8', type.subhead, '[@media(min-width:1100px)_and_(max-height:800px)]:mt-4 [@media(min-width:1100px)_and_(max-height:800px)]:text-[20px]')}>{subline.node}</p>
    {gap && <motion.div ref={spacerRef} aria-hidden="true" style={{ height: gap }} />}
    <div className="mt-12 [@media(min-width:1100px)_and_(max-height:800px)]:mt-5">
      <p id="challenge-label" data-hand-note className={cn('mb-4 mt-0', type.lead, '[@media(min-width:1100px)_and_(max-height:800px)]:mb-2')}>What sounds familiar?</p>
      <fieldset aria-labelledby="challenge-label" className="m-0 hidden min-w-0 border-0 p-0 md:block">
        <div className="grid grid-cols-3 gap-x-8 gap-y-4 min-[1100px]:grid-cols-1 [@media(min-width:1100px)_and_(max-height:800px)]:gap-y-3">
          {prototypeScenes.map(item => <div key={item.id} className="relative"><label htmlFor={`challenge-${item.id}`} className={cn('relative block min-h-14 cursor-pointer py-3 [@media(min-width:1100px)_and_(max-height:800px)]:py-2', selected === item.id && 'text-primary')}>
            <input id={`challenge-${item.id}`} name="work-challenge" type="radio" value={item.id} checked={selected === item.id} disabled={!ready} onChange={() => choose(item.id)} aria-label={`${item.situation} — ${item.audience}`} className="peer sr-only" />
            {/* One dot, handed between choices by layoutId so it slides to the new one. */}
            <span data-situation className={cn('relative block peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4', type.choice)}>{selected === item.id && <motion.span layoutId="challenge-dot" data-challenge-dot aria-hidden="true" transition={{ duration: 0.45, ease: easing }} className="absolute -left-5 top-[0.625em] size-2.5 -translate-y-1/2 rounded-full bg-primary" />}{item.situation}</span>
            <span className={cn('mt-1 block', type.caption, selected === item.id && item.views && 'invisible')}>{item.audience}</span>
            <span aria-hidden="true" className={cn('absolute bottom-0 left-0 h-[2px] w-full origin-left bg-current transition-transform duration-300 motion-reduce:transition-none', selected === item.id ? 'scale-x-100' : 'scale-x-0')} />
          </label>
          {/* A prototype with more than one view lists them under its challenge, once chosen,
              on the audience line: the opening is sized to the screen and cannot grow. */}
          {selected === item.id && item.views && <fieldset data-view-picker aria-label={`Views of ${item.title}`} className="absolute bottom-3 left-0 m-0 flex min-w-0 gap-5 border-0 p-0 [@media(min-width:1100px)_and_(max-height:800px)]:bottom-2">
            {item.views.map(option => <label key={option.id} htmlFor={`view-${option.id}`} className={cn('relative -my-[2.5px] flex min-h-6 cursor-pointer items-center gap-2', type.caption, current === option.id ? 'font-semibold text-primary' : 'text-black')}>
              <input id={`view-${option.id}`} name="work-view" type="radio" value={option.id} checked={current === option.id} disabled={!ready} onChange={() => chooseView(option.id)} className="peer sr-only" />
              <span aria-hidden="true">–</span>
              <span className={cn('peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4', current === option.id && 'underline decoration-1 underline-offset-4')}>{option.label}</span>
            </label>)}
          </fieldset>}
          </div>)}
        </div>
      </fieldset>
      <div className="relative min-h-12 border-b-2 border-current py-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 md:hidden">
        <span data-situation aria-hidden="true" className={cn('block pr-8', type.choice)}>{prototypeScenes.find(item => item.id === selected)?.situation}</span><span aria-hidden="true" className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2">⌄</span>
        <select id="challenge-select" aria-labelledby="challenge-label" disabled={!ready} value={selected} onChange={event => choose(event.target.value as PrototypeId)} className="absolute inset-0 min-h-12 w-full cursor-pointer opacity-0">{prototypeScenes.map(item => <option key={item.id} value={item.id}>{item.situation}</option>)}</select>
      </div>
      <p className="mb-0 mt-2 text-sm md:hidden">{prototypeScenes.find(item => item.id === selected)?.audience}</p>
      {scene?.views && <div data-view-picker className="relative mt-3 min-h-12 border-b border-current py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 md:hidden">
        <span aria-hidden="true" className={cn('block pr-8', type.label)}>– {scene.views.find(option => option.id === current)?.label}</span><span aria-hidden="true" className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2">⌄</span>
        <select id="view-select" aria-label={`View of ${scene.title}`} disabled={!ready} value={current ?? undefined} onChange={event => chooseView(event.target.value as PrototypeId)} className="absolute inset-0 min-h-12 w-full cursor-pointer opacity-0">{scene.views.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
      </div>}
      <noscript><nav aria-label="Case studies" className="mt-4 flex flex-col">{prototypeScenes.map(item => <a key={item.id} href={item.href} className={link}>{item.title}</a>)}</nav></noscript>
    </div>
  </motion.div>
}

type AnnotationBox = { x: number; y: number; width: number; height: number }
type AnnotationGeometry = { x: number; y: number; scale: number; closedScale: number; width: number; height: number; labels: AnnotationBox[] }
function FragmentArrow({ target, label, spread, geometry, dimensions, marker }: { target: typeof prototypeScenes[number]['targets'][number]; label: AnnotationBox; spread: MotionValue<number>; geometry: AnnotationGeometry; dimensions: { width: number; height: number }; marker: string }) {
  const d = useTransform(spread, value => {
    const fullWidth = dimensions.width + 360, fullHeight = dimensions.height + 360
    const fit = geometry.scale + (geometry.closedScale - geometry.scale) * (1 - value)
    const endX = geometry.x + fullWidth * geometry.scale / 2 + (180 + target.x + value * target.dx - fullWidth / 2) * fit
    const endY = geometry.y + fullHeight * geometry.scale / 2 + (180 + target.y + value * target.dy - fullHeight / 2) * fit
    const dx = endX - label.x - label.width / 2, dy = endY - label.y - label.height / 2
    const horizontal = Math.abs(dx / Math.max(label.width, 1)) > Math.abs(dy / Math.max(label.height, 1))
    // Leave from the middle of the label's edge, never the point nearest the
    // target: that made every target under a label a plumb line.
    const startX = horizontal ? label.x + (dx > 0 ? label.width : 0) : label.x + label.width / 2
    const startY = horizontal ? label.y + label.height / 2 : label.y + (dy > 0 ? label.height : 0)
    return `M${startX},${startY} C${(startX + endX) / 2},${startY} ${(startX + endX) / 2},${endY} ${endX},${endY}`
  })
  return <><motion.path d={d} stroke={paper} strokeWidth="5.5" /><motion.path data-fragment-arrow d={d} markerEnd={`url(#${marker})`} /></>
}

/** Pages and annotations share a grid. Arrows start at the measured label edge
 * and end at a component in the measured page, including its assembly zoom. */
function PrototypeComposition({ item, low, spread: amount, annotationOpacity, showAnnotations = true, compact = false, featured = false, delivery, onStall, className }: { item: typeof prototypeScenes[number]; low: boolean; spread: number | MotionValue<number>; annotationOpacity?: MotionValue<number>; showAnnotations?: boolean; compact?: boolean; featured?: boolean; delivery?: PrototypeDelivery; onStall?: () => void; className?: string }) {
  const grid = useRef<HTMLDivElement>(null)
  const page = useRef<HTMLDivElement>(null)
  const labels = useRef<(HTMLParagraphElement | null)[]>([])
  const fixedSpread = useMotionValue(typeof amount === 'number' ? amount : 0)
  const spread = typeof amount === 'number' ? fixedSpread : amount
  useEffect(() => { if (typeof amount === 'number') fixedSpread.set(amount) }, [amount, fixedSpread])
  const marker = `fragment-${useId().replaceAll(':', '')}`
  const dimensions = prototypeSizes[item.id]
  const [geometry, setGeometry] = useState<AnnotationGeometry>({ x: 0, y: 0, scale: 0, closedScale: 0, width: 1, height: 1, labels: [] })
  useEffect(() => {
    const canvas = grid.current, source = page.current
    if (!canvas || !source) return
    const measure = () => {
      const g = canvas.getBoundingClientRect(), p = source.getBoundingClientRect()
      const width = dimensions.width + 360, height = dimensions.height + 360
      const scale = Math.min(p.width / width, p.height / height)
      setGeometry({ x: p.left - g.left + (p.width - width * scale) / 2, y: p.top - g.top + (p.height - height * scale) / 2, scale, closedScale: Math.min(p.width / dimensions.width, p.height / dimensions.height), width: g.width, height: g.height, labels: labels.current.map(node => { const r = node?.getBoundingClientRect(); return r ? { x: r.left - g.left, y: r.top - g.top, width: r.width, height: r.height } : { x: 0, y: 0, width: 0, height: 0 } }) })
    }
    const observer = new ResizeObserver(measure)
    for (const node of [canvas, source, ...labels.current]) if (node) observer.observe(node)
    measure()
    return () => observer.disconnect()
  }, [item.id, low, dimensions.width, dimensions.height])
  const opacity = low ? 0 : annotationOpacity || (showAnnotations ? 1 : 0)
  return <div ref={grid} data-prototype-grid className={cn('relative isolate grid grid-cols-12 grid-rows-12 [container-type:inline-size]', className)}>
    <div ref={page} data-page-cell className={cn('relative col-span-12 row-span-12 col-start-1 row-start-1 min-h-0 min-w-0', !compact && !featured && 'md:col-span-10 md:col-start-2')}>
      <WorkPrototype key={item.id} id={item.id} {...(compact ? { spread: typeof amount === 'number' ? amount : 0 } : { progress: spread })} low={low} delivery={delivery} onStall={onStall} label={`${item.title} interface`} className="h-full" />
    </div>
    {!low && <>
      <motion.svg aria-hidden="true" style={annotationOpacity ? { opacity: annotationOpacity } : undefined} className={cn('pointer-events-none absolute inset-0 hidden h-full w-full md:block', compact && !showAnnotations && 'opacity-0')} viewBox={`0 0 ${geometry.width} ${geometry.height}`} fill="none" stroke="currentColor" strokeWidth={compact ? 2 : 2.5} strokeLinecap="round" strokeLinejoin="round"><defs><marker id={marker} data-connector-dot viewBox="0 0 8 8" refX="4" refY="4" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse"><circle cx="4" cy="4" r="3" fill="currentColor" stroke={paper} strokeWidth="1.5" /></marker></defs>{item.targets.map((target, index) => geometry.labels[index]?.width > 0 && <FragmentArrow key={`${item.id}-${index}`} target={target} label={geometry.labels[index]} spread={spread} geometry={geometry} dimensions={dimensions} marker={marker} />)}</motion.svg>
      {item.solutions.map((solution, index) => <motion.p ref={node => { labels.current[index] = node }} key={solution} data-annotation-cell={index} aria-hidden="true" style={{ gridColumn: `${(compact || featured) ? Math.min(item.annotationCells[index].column, 10) : item.annotationCells[index].column} / span ${(compact || featured) ? Math.max(item.annotationCells[index].span, 3) : item.annotationCells[index].span}`, gridRow: `${featured && item.annotationCells[index].row >= 9 ? 10 : compact && item.annotationCells[index].row === 1 ? 2 : item.annotationCells[index].row} / span 3`, opacity }} className={cn('pointer-events-none z-10 m-0 hidden bg-white font-medium leading-[1.25] md:block', featured ? 'w-[calc(100%+24px)] max-w-none border-l-4 border-secondary p-3' : 'w-fit max-w-full p-1', item.annotationCells[index].row === 1 ? 'self-start' : item.annotationCells[index].row >= 9 ? 'self-end' : 'self-center', featured ? 'text-[clamp(18px,2.2cqw,24px)]' : compact ? 'text-[18px] xl:text-[20px]' : 'text-[20px] xl:text-[24px]')}><strong data-annotation-title className="block font-serif text-[24px] font-bold leading-[1.05]">{emphasizeAnnotation(solution, item.emphasis[index])}</strong><span className="mt-2 block text-[18px] font-normal leading-snug">{item.reasoning[index]}</span></motion.p>)}
    </>}
  </div>
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
/** A resting value that eases to `to` over the first 30% of the scroll scene. */
function useSettle(rest: MotionValue<number>, to: number, progress: MotionValue<number>) {
  return useTransform(() => rest.get() + (to - rest.get()) * clamp01(progress.get() / 0.3))
}
/** The fixed header's height, and the room kept free for the prompt at the bottom. */
const headerHeight = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--spacing-header-height')) || 50
const promptRoom = 72
/** Share of the opening screen the choices take, in percent. Keep in step with
 * the min-[1100px] w-[31%] / ml-[31%] / w-[69%] classes (Tailwind needs literals). */
const openingShare = 31

function Work({ low, ready, selected, choose, view, chooseView, headline, subline, review }: { review?: ReactNode; low: boolean; ready: boolean; selected: PrototypeId; choose: (id: PrototypeId) => void; view: string | null; chooseView: (id: PrototypeId) => void; headline: Headline; subline: Subline }) {
  const section = useRef<HTMLElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState({ width: 1440, wide: false, measured: false })
  useEffect(() => {
    const measure = () => setViewport({ width: innerWidth, wide: innerWidth >= 1100, measured: true })
    measure(); addEventListener('resize', measure)
    return () => removeEventListener('resize', measure)
  }, [])
  const live = viewport.wide && !low
  // The still SSR layout can be exactly one viewport tall. Re-measure when
  // hydration expands it into the motion scene, before the first scroll.
  const { scrollYProgress: storyProgress } = useScroll({ target: section, offset: ['start start', 'end end'], trackContentSize: true })
  const { scrollYProgress: panelProgress } = useScroll({ target: panel, offset: ['start 0.55', 'end 0.3'], trackContentSize: true })
  const progress = useTransform(() => live ? storyProgress.get() : panelProgress.get())
  // Two ways in, one state: hovering the hero opens the layers, and scrolling
  // on opens them and holds them beside our reasoning. Each takes the larger
  // of the two, so a hover that turns into a scroll never closes and reopens.
  const scrollSpread = useTransform(() => low ? 0 : live ? clamp01((progress.get() - 0.1) / 0.4) : clamp01((progress.get() - 0.15) / 0.35))
  const inspection = useMotionValue(0)
  const [hovered, setHovered] = useState(false)
  useEffect(() => {
    const animation = animate(inspection, low ? 0 : hovered ? 1 : 0, { duration: low ? 0 : 0.6, ease: easing })
    return () => animation.stop()
  }, [inspection, hovered, low])
  const spread = useTransform(() => Math.max(inspection.get(), scrollSpread.get()))
  const annotationOpacity = useTransform(() => low ? 0 : Math.max(inspection.get(), clamp01((progress.get() - (live ? 0.35 : 0.3)) / 0.2)))
  const cue = useRef<HTMLSpanElement>(null)
  // The chip follows the cursor, so it stays hidden until the cursor has moved
  // over the preview (after a Back, the pointer can be resting there unmoved).
  const [cuePlaced, setCuePlaced] = useState(false)
  const [delivery, setDelivery] = useState<PrototypeDelivery>('pending')
  useEffect(() => setDelivery(chooseDelivery()), [])
  // The still is the finished screen only: nothing to open and no layers for
  // the callouts to point at, so it behaves like low motion.
  const still = delivery === 'still'
  // Hover belongs to the hero, before scroll has moved anything. Only a real
  // mouse movement counts: scrolling grows the preview under a still cursor,
  // and that used to open it for a moment before scroll closed it again.
  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect(), x = event.clientX - box.left, y = event.clientY - box.top
    const chip = cue.current
    if (chip && !cuePlaced) setCuePlaced(true)
    if (chip) chip.style.transform = `translate(${x + chip.offsetWidth + 40 > box.width ? x - chip.offsetWidth - 16 : x + 20}px, ${Math.min(y + 20, box.height - chip.offsetHeight)}px)`
    if (hovered || low || still || event.pointerType !== 'mouse' || (event.movementX === 0 && event.movementY === 0) || scrollSpread.get() > 0.01) return
    setHovered(true)
  }
  function select(id: PrototypeId) { setHovered(false); inspection.set(0); choose(id) }
  function selectView(id: PrototypeId) { setHovered(false); inspection.set(0); chooseView(id) }
  const transition = usePageTransition()
  const router = useRouter()
  // Fetch the three case studies ahead, so the morph never waits on the network.
  useEffect(() => {
    for (const scene of prototypeScenes) {
      router.prefetch(scene.href)
      // The still that moves into the header: loaded now, so it is never a blank box mid-move.
      new window.Image().src = `/design-lab/human/assets/${scene.id}-hero.png`
    }
  }, [router])
  // The preview becomes the case study's header: the site's card transition
  // grows it from where it sits into the hero, cross-fading from the prototype's
  // still into the case study's own image, then opens the page underneath.
  function openCase(event: ReactMouseEvent<HTMLAnchorElement>) {
    const box = zone.current?.getBoundingClientRect()
    const header = prototypeHeaderById(item.sceneId)
    if (!transition || !box || !header || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    setHovered(false)
    // The prototype itself becomes the header: it moves (it is never swapped for
    // the case study's photo) into a frame at its own proportions, and the case
    // study grows in below it. Wait (briefly) for its still to decode, so the
    // thing that moves is never an empty box.
    const image = header.still
    const still = new window.Image()
    still.src = image
    const rect = { top: box.top, left: box.left, width: box.width, height: box.height }
    Promise.race([still.decode().catch(() => undefined), new Promise(resolve => setTimeout(resolve, 250))]).then(() => {
      transition.triggerCardTransition({ ...rect, image, href: item.href, keep: { aspect: header.aspect, band: header.band } })
    })
  }
  const titleOpacity = useTransform(progress, value => 1 - clamp01((value - 0.08) / 0.2))
  const insightOpacity = useTransform(progress, value => clamp01((value - 0.35) / 0.2))
  const marginLeft = useTransform(storyProgress, [0, 0.55], [`${openingShare}%`, '0%'])
  const width = useTransform(storyProgress, [0, 0.55], [`${100 - openingShare}%`, '100%'])
  const [showExplore, setShowExplore] = useState(true)
  const [insightShown, setInsightShown] = useState(false)
  useMotionValueEvent(progress, 'change', value => {
    setShowExplore(value < 0.8)
    setInsightShown(value > 0.4)
  })
  // The chosen scene, seen through its chosen view (a scene with no views is its own).
  const item = sceneView(prototypeScenes.find(item => item.id === selected) || prototypeScenes[0], view)
  // The opening screen, measured. The two columns share a top line (headline and
  // the tallest preview) and a bottom line (last choice and the preview), and together
  // sit centred between the nav bar and the prompt at the bottom. Whichever column
  // is shorter takes the difference in one spacer: under the line on the left,
  // above the preview on the right. A preview too tall for the screen shrinks to
  // fit. Measured at rest; scrolling on eases the panel back to its own spacing.
  const opening = useRef<HTMLDivElement>(null)
  const leftSpacer = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLDivElement>(null)
  const zone = useRef<HTMLDivElement>(null)
  const restTop = useMotionValue(0)
  const restBottom = useMotionValue(96)
  const leftGap = useMotionValue(0)
  const rightGap = useMotionValue(0)
  const [aligned, setAligned] = useState(false)
  // The prototype's name and task are for screen readers only (the preview speaks for
  // itself at first sight), so the line above the preview is empty at rest. Once the
  // layers open, the insight needs room there: it opens as the scroll brings it in.
  const insight = useRef<HTMLDivElement>(null)
  const insightRoom = useMotionValue(0)
  const headingRoom = useTransform(() => insightRoom.get() * clamp01((progress.get() - 0.08) / 0.27))
  useEffect(() => {
    const node = insight.current
    if (!live || !node) return
    const set = () => insightRoom.set(node.offsetHeight + 12)
    set()
    const observer = new ResizeObserver(set)
    observer.observe(node)
    return () => observer.disconnect()
  }, [live, insightRoom])
  const panelTop = useSettle(restTop, 96, progress)
  const panelBottom = useSettle(restBottom, 96, progress)
  const previewGap = useSettle(rightGap, 0, progress)
  // The preview's height at rest, animated when the prototype changes; scrolling
  // on hands it back to the prototype's own proportions at the panel's width.
  const zoneRest = useMotionValue(0)
  const ratio = prototypeSizes[item.id].height / prototypeSizes[item.id].width
  const zoneHeight = useTransform(() => {
    // Runs on the server too, where there is no window: no preview height to give yet.
    if (typeof window === 'undefined') return 0
    const value = progress.get()
    const panelWidth = innerWidth * ((100 - openingShare) / 100 + openingShare / 100 * clamp01(value / 0.55)) - innerWidth * 0.08
    return zoneRest.get() + (panelWidth * ratio - zoneRest.get()) * clamp01(value / 0.3)
  })
  useEffect(() => {
    if (!live) { setAligned(false); return }
    let first = true
    const measure = () => {
      if (progress.get() > 0.02) return
      const copy = opening.current, title = heading.current, preview = zone.current
      if (!copy || !title || !preview) return
      const style = getComputedStyle(copy)
      const left = copy.offsetHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - (leftSpacer.current?.offsetHeight || 0)
      const navHeight = headerHeight()
      const room = innerHeight - navHeight - promptRoom
      if (left > room) { setAligned(false); return }
      // Lay the screen out for the tallest prototype, so choosing another never
      // moves the column the reader is clicking in; only the preview's top glides.
      const natural = (id: PrototypeId) => preview.offsetWidth * prototypeSizes[id].height / prototypeSizes[id].width
      const space = room - title.offsetHeight
      const tallest = Math.min(space, Math.max(...prototypeScenes.flatMap(scene => scene.views ? scene.views.map(option => natural(option.id)) : [natural(scene.id)])))
      const current = Math.min(space, natural(item.id))
      const height = Math.max(left, title.offsetHeight + tallest)
      const top = navHeight + (room - height) / 2
      const options = { duration: first ? 0 : 0.5, ease: easing }
      animate(restTop, top, options)
      animate(restBottom, innerHeight - top - height, options)
      animate(leftGap, height - left, options)
      animate(rightGap, height - title.offsetHeight - current, options)
      animate(zoneRest, current, options)
      first = false
      setAligned(true)
    }
    const observer = new ResizeObserver(measure)
    for (const node of [opening.current, heading.current, zone.current]) if (node) observer.observe(node)
    addEventListener('resize', measure)
    measure()
    return () => { observer.disconnect(); removeEventListener('resize', measure) }
  }, [live, item.id, progress, restTop, restBottom, leftGap, rightGap, zoneRest])
  const panelStyle = !viewport.measured ? undefined : live ? { marginLeft, width } : { marginLeft: viewport.wide ? `${openingShare}%` : '0%', width: viewport.wide ? `${100 - openingShare}%` : '100%' }
  return <section ref={section} id="human" data-scene="component-assembly" data-story-live={live} aria-labelledby="human-title" className={cn('scene relative bg-white', live ? 'is-live h-[185svh]' : 'is-rest min-[1100px]:min-h-svh')}>
    {live && <span id="work-result" aria-hidden="true" className="absolute left-0 top-[80svh]" />}
    <Opening headline={headline} subline={subline} review={review} low={low} ready={ready} selected={selected} choose={select} view={view} chooseView={selectView} progress={progress} live={live} openingRef={opening} top={aligned ? restTop : undefined} spacerRef={leftSpacer} gap={aligned ? leftGap : undefined} />
    <motion.div ref={panel} id="work" role="region" aria-labelledby="work-title" style={{ ...panelStyle, ...(aligned ? { paddingTop: panelTop, paddingBottom: panelBottom } : {}) }} className={cn('relative ml-0 flex w-full flex-col px-5 pb-24 pt-8 md:px-[4vw] min-[1100px]:ml-[31%] min-[1100px]:w-[69%] min-[1100px]:pt-24', low || !viewport.wide ? 'min-h-svh' : 'h-svh min-h-[680px]', live && 'sticky top-0')}>
      {!live && <span id="work-result" aria-hidden="true" className={cn('absolute left-0', low ? 'top-0' : 'top-[80%]')} />}
      <motion.div ref={heading} style={live ? { minHeight: headingRoom } : undefined} className="relative z-20">
        {/* Named for screen readers (the region's label, announced when the choice
            changes); not shown, so the opening screen is the headline, the choices
            and the preview. */}
        <motion.div data-story-heading className="sr-only" style={live ? { opacity: titleOpacity } : undefined}>
          <h2 id="work-title" aria-live="polite" className={cn('m-0', type.title)}>{item.title}</h2>
          <p id="work-task" data-story-task className={cn('m-0', type.body)}>{item.task}</p>
        </motion.div>
        {/* The insight appears above the preview once the layers open. */}
        {live && <motion.div ref={insight} data-story-insight aria-hidden={!insightShown} style={{ opacity: insightOpacity }} className="pointer-events-none absolute inset-x-0 bottom-3 pr-40">
          <p className={cn('mb-2 mt-0', type.label)}>{detailInsight.eyebrow}</p>
          <p className={cn('m-0 max-w-[40ch]', type.title)}>{detailInsight.statement}</p>
        </motion.div>}
        <a href="#human" aria-hidden={!low && showExplore} tabIndex={low || !showExplore ? 0 : -1} onClick={event => { event.preventDefault(); jumpTo('human', low) }} className={cn(link, type.label, 'text-inherit hover:underline', low ? 'mb-3 ml-auto block w-fit' : 'absolute right-0 top-0', !low && showExplore && 'invisible')}>Choose another ↑</a>
      </motion.div>
      {aligned && <motion.div aria-hidden="true" style={{ height: previewGap }} className="shrink-0" />}
      <motion.div ref={zone} data-inspection-zone data-inspecting={hovered && !low} onPointerMove={pointerMove} onPointerLeave={() => setHovered(false)} style={aligned ? { height: zoneHeight } : { aspectRatio: `${prototypeSizes[item.id].width}/${prototypeSizes[item.id].height}` }} className={cn('relative w-full', low || !viewport.wide ? 'my-6' : 'min-h-0 shrink')}>
        <PrototypeComposition item={item} low={low || still} spread={spread} annotationOpacity={annotationOpacity} featured delivery={delivery} onStall={() => setDelivery('still')} className="h-full" />
        {/* The whole preview is the link to the case study, for pointer and keyboard alike. */}
        <a href={item.href} data-case-overlay onClick={openCase} aria-label={`Read the ${item.title} case study`} aria-describedby="work-task" className={cn('group absolute inset-0 z-20 cursor-pointer', focus)}>
          {!low && <span ref={cue} data-case-cue className={cn('pointer-events-none absolute left-0 top-0 w-max items-center gap-3 bg-white px-3 py-2 text-base leading-snug text-black opacity-0 transition-opacity duration-300 group-focus-visible:opacity-100', cuePlaced && 'group-hover:opacity-100', ' motion-reduce:transition-none', live && insightShown ? 'hidden' : 'inline-flex')} style={{ transform: 'translate(16px, 16px)' }}>Read the case study <Arrow /></span>}
        </a>
      </motion.div>
      {!live && <div data-story-insight className="mb-6"><p className={cn('mb-2 mt-0', type.label)}>{detailInsight.eyebrow}</p><p className={cn('m-0 max-w-[34ch]', type.title)}>{detailInsight.statement}</p></div>}
      <ul id="work-actions" data-action-list className={cn('m-0 mb-5 list-none space-y-5 p-0 text-[18px] leading-snug', !low && !still && 'md:sr-only')}>{item.solutions.map((solution, index) => <li key={solution} className="border-l-4 border-secondary bg-white p-3"><strong data-annotation-title className="block font-serif text-[24px] font-bold leading-[1.05]">{emphasizeAnnotation(solution, item.emphasis[index])}</strong><span className="mt-2 block">{item.reasoning[index]}</span></li>)}</ul>
    </motion.div>
  </section>
}

/** What the bottom prompt says while each section is being read: a reason to
 * keep going, pointing at the next section. */
const nextSteps = [
  { after: 'human', target: 'work-result', text: 'See how we think' },
  { after: 'work-result', target: 'ask', text: 'Not on the list? Describe yours' },
  { after: 'ask', target: 'services', text: 'What we could do for you' },
  { after: 'services', target: 'proof', text: 'Who we’ve done it for' },
  { after: 'proof', target: 'evidence', text: 'How it holds up at scale' },
  { after: 'evidence', target: 'contact', text: 'Tell us what you’re working on' },
]

/** How close to the bottom of the window the pointer has to come to call the prompt up. */
const PROMPT_REACH = 120

/** One prompt, centred on the page. On the opening it is the invitation to scroll; after
 * that it stays out of the way (it sat on top of whatever the reader was looking at) and
 * comes up only when the pointer nears the bottom of the window, or when it takes keyboard
 * focus. As the reader moves on, the old line rises and fades while the next slides up
 * from below. Gone once the contact form is in view. */
function NextPrompt({ low }: { low: boolean }) {
  const [step, setStep] = useState(0)
  const [opening, setOpening] = useState(true)
  const [near, setNear] = useState(false)
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      let current = 0
      nextSteps.forEach((next, index) => { const el = document.getElementById(next.after); if (el && el.getBoundingClientRect().top <= innerHeight * 0.4) current = index })
      const contact = document.getElementById('contact')
      if (contact && contact.getBoundingClientRect().top <= innerHeight * 0.85) current = -1
      setStep(current)
      setOpening(scrollY < innerHeight * 0.25)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure) }
    // A mouse or trackpad only: a touch has no hover, so there the prompt is the opening's alone.
    const pointer = (event: PointerEvent) => { if (event.pointerType === 'mouse' || event.pointerType === 'pen') setNear(event.clientY >= innerHeight - PROMPT_REACH) }
    const away = () => setNear(false)
    measure()
    addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule)
    addEventListener('pointermove', pointer, { passive: true }); document.documentElement.addEventListener('pointerleave', away)
    const observer = new ResizeObserver(schedule)
    observer.observe(document.body)
    return () => { cancelAnimationFrame(frame); observer.disconnect(); removeEventListener('scroll', schedule); removeEventListener('resize', schedule); removeEventListener('pointermove', pointer); document.documentElement.removeEventListener('pointerleave', away) }
  }, [low])
  const next = step >= 0 ? nextSteps[step] : null
  const shown = opening || near || focused
  return <nav aria-label="Next section" data-prompt-shown={shown} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} className={cn('pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center transition-[opacity,translate] duration-300 ease-standard motion-reduce:transition-none', shown ? 'opacity-100' : 'translate-y-3 opacity-0')}>
    <AnimatePresence mode="popLayout" initial={false}>
      {next && <motion.a key={next.target} href={`#${next.target}`} data-explore-link initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -28, opacity: 0 }} transition={{ duration: 0.45, ease: easing }} onClick={event => { event.preventDefault(); jumpTo(next.target, low) }} className={cn(link, type.lead, 'whitespace-nowrap bg-white px-4 text-inherit hover:underline', shown && 'pointer-events-auto')}>{next.text} <Arrow direction="down" /></motion.a>}
    </AnimatePresence>
  </nav>
}

function ServiceRow({ offering, low }: { offering: typeof humanOfferings[number]; low: boolean }) {
  const row = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: row, offset: ['start 0.9', 'start 0.3'], trackContentSize: true })
  const x = useTransform(scrollYProgress, [0, 0.85], [18, 0])
  const y = useTransform(scrollYProgress, [0, 0.85], [28, 0])
  const concernY = useTransform(scrollYProgress, [0, 1], [14, -8])
  return <div ref={row} data-service-motion className="py-8 md:py-12">
    <motion.p data-hand-note style={{ y: low ? 0 : concernY }} className={cn('mb-6 mt-0 max-w-[30ch] text-gray', type.lead)}>“{offering.concern}”</motion.p>
    <motion.div style={{ x: low ? 0 : x, y: low ? 0 : y }} className="pr-4 md:pr-0">
      <h3 className={cn('m-0 max-w-[19ch]', type.title)}><DrawnLine progress={scrollYProgress} low={low} start={0.15} end={0.9}>{offering.title}</DrawnLine></h3>
      <p className={cn('mb-2 mt-5 max-w-[50ch]', type.body)}>{offering.description}</p>
      <TextLink href={`https://www.goinvo.com${offering.href}/`} nudge={!low}>{offering.link}</TextLink>
    </motion.div>
  </div>
}

function Services({ low }: { low: boolean }) {
  return <Section tone="dark" id="services" aria-labelledby="services-title">
    <div className="grid items-start gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
      <div className={cn(!low && 'md:sticky md:top-[16vh]')}>
        <SectionHeading id="services-title" sweep reduced={low} text="Make the next move." className="max-w-[12ch]" />
        <p className={cn('mb-0 mt-8 max-w-[29ch]', type.lead)}>Strategy, research, design, and development—around the people who use your product.</p>
      </div>
      <div className="-mt-8 md:-mt-12">{humanOfferings.map(offering => <ServiceRow key={offering.title} offering={offering} low={low} />)}</div>
    </div>
  </Section>
}

function Trust({ low }: { low: boolean }) {
  const section = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: section, offset: ['start 0.95', 'start 0.15'], trackContentSize: true })
  const boundary = useTransform(scrollYProgress, [0, 1], ['inset(0 0 0% 0)', 'inset(0 0 100% 0)'])
  const numberFill = useTransform(scrollYProgress, [0.1, 1], ['inset(100% 0 0 0)', 'inset(0% 0 0 0)'])
  return <Section ref={section} tone="grey" id="proof" aria-labelledby="proof-title" className="relative isolate">
    <motion.div data-proof-wipe aria-hidden="true" style={{ clipPath: low ? 'inset(0 0 100% 0)' : boundary }} className="pointer-events-none absolute inset-0 -z-10 bg-white" />
    {/* One fill in this section: the number rising from the bottom. The heading
        and copy stay still, so two fills never run in different directions. */}
    <SectionHeading id="proof-title" text="Experience where it matters." className="max-w-[18ch]" />
    <div className="mt-12 grid items-start gap-12 md:mt-16 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
      <div><p className="relative m-0 w-fit font-serif text-[clamp(100px,17vw,240px)] leading-[0.85] tracking-[-0.05em]">{humanProof.experience}<motion.span data-experience-fill aria-hidden="true" className="pointer-events-none absolute inset-0 text-secondary" style={{ clipPath: low ? 'inset(0)' : numberFill }}>{humanProof.experience}</motion.span></p><p className={cn('mb-4 mt-6 max-w-[20ch]', type.lead)}>{humanProof.experienceLabel}</p><TextLink href={humanProof.source}>Explore our experience</TextLink></div>
      <div><p className={cn('mb-6 mt-0 max-w-[40ch]', type.lead)}>From clinical decisions to public services and enterprise tools, we help teams make complex systems usable.</p><TextLink href="https://www.goinvo.com/work/">See the work</TextLink></div>
    </div>
    <p className={cn('mb-8 mt-16 md:mt-24', type.label)}>Past partners</p>
    <ul aria-label="Published client list" className="m-0 grid list-none grid-cols-3 items-center gap-x-6 gap-y-10 p-0 md:grid-cols-4 md:gap-x-12 md:gap-y-12 xl:grid-cols-6">{humanProof.clients.map(client => <li key={client.name} className="flex h-14 items-center justify-center"><Image src={`/images/logos/${client.file}`} alt={client.name} width={160} height={56} className="h-auto max-h-14 w-full max-w-[160px] object-contain grayscale brightness-[0.6]" /></li>)}</ul>
    <div className="mt-20 grid gap-14 md:mt-28 md:grid-cols-2 md:gap-20">{humanProof.testimonials.map(quote => <figure key={quote.name} className="m-0"><blockquote cite={quote.source} className="m-0"><p className={cn('m-0', type.quote)}>“{quote.quote}”</p></blockquote><figcaption className={cn('mt-6', type.label)}><a href={quote.source} className="text-inherit underline underline-offset-4">{quote.name}</a><br />{quote.organization}</figcaption></figure>)}</div>
  </Section>
}

/** Big organizations, told the same way as the rest of the page: the person
 * the system lost, then what changed once the work fit them. */
function EvidenceRow({ scene, index, low }: { scene: typeof humanEvidence[number]; index: number; low: boolean }) {
  const row = useRef<HTMLLIElement>(null)
  const { scrollYProgress } = useScroll({ target: row, offset: ['start 0.95', 'start 0.45'], trackContentSize: true })
  const crop = useTransform(scrollYProgress, [0, 1], ['inset(14% 0 14% 0)', 'inset(0% 0 0% 0)'])
  const scale = useTransform(scrollYProgress, [0, 1], [1.15, 1])
  const outcome = `${scene.prefix ?? ''}${scene.to}${scene.suffix}`
  return <li ref={row} data-evidence-row className="grid items-center gap-8 border-t border-black/15 py-12 md:grid-cols-2 md:gap-16 md:py-16">
    <motion.div style={{ clipPath: low ? 'inset(0)' : crop }} className={cn('relative aspect-[4/3] overflow-hidden', index % 2 === 1 && 'md:order-2')}>
      <motion.div style={{ scale: low ? 1 : scale }} className="absolute inset-0"><Image src={scene.image} alt={scene.alt} fill sizes="(min-width:768px) 45vw, 90vw" className="object-cover" /></motion.div>
    </motion.div>
    <div>
      <p className={cn('m-0', type.label)}>{scene.client} · {scene.context}</p>
      <h3 className={cn('mb-0 mt-4 max-w-[22ch]', type.title)}>{scene.observation}</h3>
      <p data-evidence-outcome className="mb-0 mt-8 font-serif text-[clamp(56px,7vw,104px)] leading-[0.9] tracking-[-0.04em]">{outcome}</p>
      <p className={cn('mb-4 mt-3 max-w-[40ch]', type.body)}>{scene.result}</p>
      <TextLink href={`https://www.goinvo.com${scene.href}/`}>Read the case study</TextLink>
    </div>
  </li>
}

function Evidence({ low }: { low: boolean }) {
  return <Section id="evidence" aria-labelledby="evidence-title">
    <div className="grid gap-8 md:grid-cols-2 md:items-end md:gap-16">
      <SectionHeading id="evidence-title" sweep reduced={low} text="Built for big machinery." className="max-w-[14ch]" />
      <p className={cn('m-0 max-w-[44ch]', type.lead)}>Statewide programs, hospital systems, global research firms. The bigger the organization, the easier it is to lose sight of the person doing the work.</p>
    </div>
    <ul aria-label="Work for large organizations" className="m-0 mt-12 list-none p-0 md:mt-16">{humanEvidence.map((scene, index) => <EvidenceRow key={scene.id} scene={scene} index={index} low={low} />)}</ul>
    <div className="flex flex-col gap-4 border-t border-black/15 pt-10 md:flex-row md:items-end md:justify-between">
      <p className={cn('m-0 max-w-[48ch]', type.lead)}>{humanEvidenceSummary}</p>
      <TextLink href="https://www.goinvo.com/work/" className="shrink-0">See all the work</TextLink>
    </div>
  </Section>
}

/** The form arrives with the visitor's last search already in it (asked), so nobody types
 * their problem twice; the email note carries it too. */
function Contact({ selected, asked }: { selected: PrototypeId; asked: string }) {
  const challenge = prototypeScenes.find(item => item.id === selected)?.challenge || 'A new project'
  const note = projectNoteHref('info@goinvo.com', challenge, asked)
  return (
    <Section spacing="none" aria-label="Contact" id="contact" className="scroll-mt-24 pb-7 pt-24 md:pt-36">
      <div className="grid items-start gap-10 md:grid-cols-2 md:gap-16">
        <Reveal style="settle" duration={0.7}><SectionHeading text="What are you working on?" className="max-w-[13ch]" /><p className={cn('mb-0 mt-7 max-w-[34ch]', type.body)}>A question or a rough idea is enough. No meeting required.</p><p className={cn('mb-0 mt-7', type.label)}>Prefer to talk? <InlineLink href="https://calendly.com/goinvo/open-office-hours">Book a conversation.</InlineLink></p></Reveal>
        <div data-inquiry-form><ContactFormEmbed showHeader={false} variant="inline" message={asked || undefined} /><p className={cn('mb-0 mt-4', type.label)}>Or <InlineLink href={note}>send a project note by email</InlineLink>.</p></div>
      </div>
    </Section>
  )
}

export function HumanHome({ work }: { work?: string }) {
  // SSR and no-script output are the complete, still composition. Motion is an
  // enhancement after checking OS preference, the review URL, and saved choice.
  const [low, setLow] = useState(true)
  const [ready, setReady] = useState(false)
  const [largerText, setLargerText] = useState(false)
  // Read from the live address, not only the server's: Back is served from the
  // router's cache of the first render, made before the choice was written there.
  const params = useSearchParams()
  const [selected, setSelected] = useState<PrototypeId>(() => {
    const wanted = params.get('work') ?? work
    return prototypeScenes.some(scene => scene.id === wanted) ? wanted as PrototypeId : 'clinical'
  })
  const [view, setView] = useState<string | null>(() => params.get('view'))
  // Review only: the headline and the line under it (`?headline=`, `?subline=`).
  const [headlineKey, setHeadlineKey] = useState<string | null>(() => params.get('headline'))
  const [sublineKey, setSublineKey] = useState<string | null>(() => params.get('subline'))
  const headline = taglineFor(headlineKey)
  const showPicker = ready && taglinePickerEnabled && params.get('picker') !== 'off'
  const subline = sublineFor(sublineKey, headline)
  function chooseTagline(nextHeadline: string, nextSubline: string | null) {
    setHeadlineKey(nextHeadline)
    setSublineKey(nextSubline)
    const url = new URL(window.location.href)
    url.searchParams.set('headline', nextHeadline)
    if (nextSubline) url.searchParams.set('subline', nextSubline)
    else url.searchParams.delete('subline')
    window.history.replaceState(window.history.state, '', url)
    // The headline is at the top: bring it into view when choosing from further down.
    if (window.scrollY > window.innerHeight * 0.5) window.scrollTo({ top: 0, behavior: low ? 'auto' : 'smooth' })
  }
  // The visitor's last search, carried down into the contact form.
  const [asked, setAsked] = useState('')
  function choose(id: PrototypeId) {
    setSelected(id)
    setView(null)
    const url = new URL(window.location.href)
    url.searchParams.set('work', id)
    url.searchParams.delete('view')
    window.history.replaceState(window.history.state, '', url)
  }
  function chooseView(id: PrototypeId) {
    setView(id)
    const url = new URL(window.location.href)
    url.searchParams.set('view', id)
    window.history.replaceState(window.history.state, '', url)
  }
  const choice = useRef<'low' | 'full' | null>(null)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const parameter = new URLSearchParams(window.location.search).get('motion')
    let stored: string | null = null
    try { stored = localStorage.getItem(storageKey) } catch { /* Storage is optional in private browsers. */ }
    choice.current = parameter === 'low' || parameter === 'full' ? parameter : stored === 'low' || stored === 'full' ? stored : null
    setLow(choice.current ? choice.current === 'low' : media.matches)
    setReady(true)
    try { setLargerText(localStorage.getItem('goinvo-human-large-text') === 'true') } catch { /* Optional storage. */ }
    const sync = () => { if (choice.current === null) setLow(media.matches) }
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  function toggleMotion() {
    const next = !low
    choice.current = next ? 'low' : 'full'
    setLow(next)
    try { localStorage.setItem(storageKey, choice.current) } catch { /* The switch still works without storage. */ }
    const url = new URL(window.location.href)
    url.searchParams.set('motion', choice.current)
    window.history.replaceState(null, '', url)
  }

  return (
    <MotionConfig reducedMotion={low ? 'always' : 'never'}>
      <div data-human-home data-motion={low ? 'low' : 'full'} style={{ color: ink, background: paper }} className={cn("relative mx-auto min-h-svh w-[calc(100%_-_56px)] pb-24 font-sans selection:bg-secondary selection:text-white md:w-full", largerText && "[&_p.text-base]:text-[20px] [&_p.text-base]:leading-relaxed [&_p.text-body]:text-[20px] [&_p.text-body]:leading-relaxed")}>
        <div id="human-main"><Work low={low || largerText} ready={ready} selected={selected} choose={choose} view={view} chooseView={chooseView} headline={headline} subline={subline} review={showPicker ? <TaglinePicker placement="inline" tagline={headline} subline={subline} choose={chooseTagline} /> : null} /><HomeSearch onAsked={setAsked} /><Services low={low} /><Trust low={low} /><Evidence low={low} /></div>
        <Contact selected={selected} asked={asked} />
        <NextPrompt low={low} />
        {showPicker && <TaglinePicker placement="floating" tagline={headline} subline={subline} choose={chooseTagline} />}
        <HumanPageControls low={low} ready={ready} toggleMotion={toggleMotion} largerText={largerText} setLargerText={value => { setLargerText(value); try { localStorage.setItem('goinvo-human-large-text', String(value)) } catch { /* Optional storage. */ } }} />
      </div>
    </MotionConfig>
  )
}

