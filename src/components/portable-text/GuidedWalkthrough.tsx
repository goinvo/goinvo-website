'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ease, useReducedMotion } from '@/lib/motion'
import { urlForImage } from '@/sanity/lib/image'
import { cn } from '@/lib/utils'
import { option } from '@/lib/sanityOptions'
import { captionTextClassName } from '@/lib/typography'
import { focusCrop, imageDimensions, validFocus, walkthroughUrl, type GuidedWalkthroughValue } from '@/lib/guidedWalkthrough'

export function GuidedWalkthrough({ value }: { value: GuidedWalkthroughValue }) {
  const [active, setActive] = useState(0)
  const [overview, setOverview] = useState(false)
  const [exploring, setExploring] = useState(false)
  const [phoneVideo, setPhoneVideo] = useState(false)
  const id = useId()
  const stageRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const reducedMotion = useReducedMotion()
  useEffect(() => {
    const media = window.matchMedia('(max-width: 567px)')
    const update = () => setPhoneVideo(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const scenes = (value.scenes || []).filter(scene => scene.image?.asset && scene.title && scene.description)
  const scene = scenes[Math.min(active, scenes.length - 1)]
  const previewOnly = option(value.variant) === 'preview'
  if (!scene && !previewOnly) return null
  const dimensions = scene ? imageDimensions(scene.image) : { width: 1440, height: 960 }
  const crop = overview ? { x: 0, y: 0, width: 100, height: 100 } : focusCrop(scene?.focus, dimensions)
  const imageUrl = scene ? urlForImage(scene.image).width(1800).quality(95).url() : ''
  const demoUrl = (!previewOnly && walkthroughUrl(scene?.demoUrl)) || walkthroughUrl(value.demoUrl)
  const canFocus = validFocus(scene?.focus)
  const film = value.overviewVideo
  const filmUrl = walkthroughUrl((phoneVideo && film?.mobileUrl) || film?.url)
  const filmPoster = walkthroughUrl((phoneVideo && film?.mobilePoster) || film?.poster)
  const choose = (index: number, focusHeading = true) => {
    setActive(index); setOverview(false); setExploring(false)
    if (focusHeading) requestAnimationFrame(() => { headingRef.current?.focus({ preventScroll: true }); headingRef.current?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'instant' : 'smooth' }) })
  }
  const control = 'min-h-11 px-4 py-2 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-secondary active:bg-secondary/15'

  return (
    <>
    {filmUrl && <figure data-walkthrough-film className="!mt-0 !mb-8">
      <div className="relative aspect-[4/5] sm:aspect-[8/5] bg-tertiary-lightest">
        <video src={filmUrl} poster={filmPoster} controls muted playsInline preload="none" aria-label={`${value.title} overview`} className="absolute inset-0 block w-full h-full object-contain" />
      </div>
      {film?.description && <figcaption className="!mt-3 !mb-0 !text-left !not-italic text-base !text-tertiary">{film.description}</figcaption>}
      {value.notice && <p role="note" className={cn(captionTextClassName, '!mt-3 !mb-0 max-w-[75ch]')}>{value.notice}</p>}
      {film?.transcript && <details className="mt-3 text-base text-tertiary">
        <summary className="cursor-pointer min-h-11 py-2 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-secondary">Read the video transcript</summary>
        <p className="!mt-2 !mb-0 whitespace-pre-line !text-tertiary max-w-[65ch]">{film.transcript}</p>
      </details>}
    </figure>}
    {previewOnly && demoUrl && <section aria-label={`${value.title} live preview`} data-demo-preview className="mt-8 mb-8">
      <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-11 mb-3 text-base font-semibold text-secondary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-secondary">{value.demoLabel || 'View full size (opens in a new tab)'} <span aria-hidden="true" className="ml-2">↗</span></a>
      <div className="w-screen relative left-1/2 -ml-[50vw]">
        <iframe src={demoUrl} title={`${value.title} live preview`} className="block w-full h-[800px] border-0 bg-white" allowFullScreen loading="lazy" sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox" />
      </div>
      {!filmUrl && value.notice && <p role="note" className={cn(captionTextClassName, '!mt-3 !mb-0 max-w-[75ch]')}>{value.notice}</p>}
    </section>}
    {!previewOnly && scene && <section aria-label={value.title} data-guided-walkthrough className="w-screen relative left-1/2 -ml-[50vw] bg-tertiary-lightest text-black my-8 lg:my-10">
      <div className="max-width mx-auto content-padding py-6 lg:py-8">
        {filmUrl && <h2 className="font-serif !text-[28px] !mt-0 !mb-5">Explore the interface</h2>}
        <nav aria-label={`${value.title} chapters`} className="mb-6">
          <label className="flex lg:hidden gap-3 items-center text-base !text-black">Chapter
            <select aria-label={`${value.title} chapter`} value={active} onChange={event => choose(Number(event.target.value), false)} className="min-w-0 flex-1 bg-white !text-black text-base min-h-12 px-3 py-2 focus-visible:outline-2 focus-visible:outline-secondary">
              {scenes.map((item,index) => <option key={item._key} value={index}>{item.navigationTitle || item.title}</option>)}
            </select>
          </label>
          <ol className="!m-0 !p-0 !list-none hidden lg:flex flex-wrap gap-2">
            {scenes.map((item, index) => (
              <li key={item._key} className="!m-0 !p-0 before:!hidden">
                <button type="button" aria-current={index === active ? 'step' : undefined} aria-controls={`${id}-scene`} onClick={() => choose(index)} className={cn(control, index === active ? 'bg-secondary text-white' : 'bg-white text-tertiary hover:bg-secondary/10')}>
                  {item.navigationTitle || item.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div id={`${id}-scene`} className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.65fr)] gap-4 lg:gap-10 items-start">
          <div className="contents lg:block min-w-0">
            <div className="order-1">
              <h2 ref={headingRef} tabIndex={-1} className="font-serif !text-[32px] lg:!text-[36px] !leading-[1.1] !mt-0 !mb-0 lg:!mb-4 text-balance scroll-mt-20 focus:outline-none">{scene.title}</h2>
            </div>
            <div className="order-3">
              <p className="!m-0 !text-black text-base leading-relaxed max-w-[60ch]">{scene.description}</p>
            {scene.tryPrompt && <p className="!mt-5 !mb-4 !text-black text-base leading-relaxed"><strong>Try it:</strong> {scene.tryPrompt}</p>}
            </div>
          </div>

          <div ref={stageRef} className="order-2 lg:order-none min-w-0 scroll-mt-20" data-walkthrough-stage>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              {exploring && <p className="!m-0 text-base !text-tertiary">Working prototype</p>}
              {!exploring && canFocus && <button type="button" aria-pressed={overview} onClick={() => setOverview(!overview)} className="min-h-11 text-base underline underline-offset-4 text-secondary px-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-secondary">
                {overview ? 'Show detail' : 'Show full interface'}
              </button>}
              {demoUrl && <button type="button" onClick={() => { setExploring(!exploring); stageRef.current?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'instant' : 'smooth' }) }} className={cn(control, 'bg-primary !text-white hover:bg-primary-dark !px-5')}>
                {exploring ? 'Back to the walkthrough' : 'Try this part'}
              </button>}
            </div>
            {exploring && demoUrl ? (
              <iframe key={`${scene._key}-demo`} src={demoUrl} title={`${value.title}: ${scene.title}`} className="block w-full h-[580px] lg:h-[620px] border-0 bg-white" allowFullScreen sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox" />
            ) : (
              <figure className="!m-0">
                <div data-walkthrough-image data-ui className="relative overflow-hidden bg-white" style={{ aspectRatio: `${dimensions.width * crop.width} / ${dimensions.height * crop.height}` }}>
                  <motion.div initial={false} animate={{ left: `${-crop.x / crop.width * 100}%`, top: `${-crop.y / crop.height * 100}%`, width: `${10000 / crop.width}%` }} transition={{ duration: reducedMotion ? 0 : .4, ease: ease.standard }} className="absolute">
                    <Image key={imageUrl} src={imageUrl} alt={scene.image.alt || scene.title} width={dimensions.width} height={dimensions.height} sizes="(max-width: 863px) 160vw, 1200px" className="block !m-0 w-full h-auto max-w-none" priority={active === 0} />
                    {canFocus && <span data-focus-region aria-hidden="true" className="absolute pointer-events-none border-[3px] border-primary" style={{ left: `${scene.focus!.x}%`, top: `${scene.focus!.y}%`, width: `${scene.focus!.width}%`, height: `${scene.focus!.height}%` }} />}
                  </motion.div>
                </div>
                <figcaption className="!mt-3 !mb-0 !not-italic !text-left text-base !text-tertiary leading-relaxed">{scene.image.caption || scene.focusLabel}</figcaption>
              </figure>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-between items-center gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            <button type="button" disabled={active === 0} onClick={() => choose(active - 1)} className={cn(control, 'bg-white text-tertiary hover:bg-secondary/10 disabled:opacity-40 disabled:cursor-not-allowed')}>Previous</button>
            <span role="status" className="text-base text-tertiary px-2">{active + 1} of {scenes.length}</span>
            <button type="button" disabled={active === scenes.length - 1} onClick={() => choose(active + 1)} className={cn(control, 'bg-secondary text-white hover:bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed')}>Next</button>
          </div>
          {demoUrl && <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-11 text-base font-semibold text-secondary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-secondary">{value.demoLabel || 'Open the full demo'} <span aria-hidden="true" className="ml-2">↗</span></a>}
        </div>
        {!filmUrl && value.notice && <p role="note" className={cn(captionTextClassName, '!mb-0 !mt-5 max-w-[75ch]')}>{value.notice}</p>}
        <noscript><div className="mt-8">{scenes.slice(1).map(item => <section key={item._key} className="mb-8"><h2>{item.title}</h2><p>{item.description}</p><Image src={urlForImage(item.image).width(1200).url()} alt={item.image.alt || item.title} {...imageDimensions(item.image)} className="w-full h-auto" />{item.tryPrompt && <p>{item.tryPrompt}</p>}</section>)}</div></noscript>
      </div>
    </section>}
    </>
  )
}
