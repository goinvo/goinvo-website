'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cloudfrontImage, cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/motion'
import { type } from '@/components/ui/type'
import { Arrow } from '@/components/ui/Arrow'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { TextLink, focusRing, textLinkClass } from '@/components/ui/TextLink'
import { EXAMPLE_QUERIES, LINE_SUGGESTION, SUGGESTED_QUERIES } from '@/lib/search/suggested'
import type { SearchVia } from '@/lib/search/searchLog'
import { edgeBlock, focusPosition, leadBlockColor, pictureFit, SEARCH_PICTURE_FRAME, type PictureEdges, type PictureFocus } from '@/lib/search/picture'

/**
 * "Not on the list? Describe yours." The opening offers three situations; this lets
 * a reader type their own and get our closest published work back. It is the AI search
 * from the old homepage band (POST /api/search: lexical recall, then Claude selects and
 * describes, every blurb checked against its project's own words), in the homepage
 * study's design.
 *
 * Two-phase: an instant keyword pass paints first, then the AI answer replaces it.
 * Every state is honest: keyword-only results say so, adjacent work says it is
 * adjacent, and a query nothing fits says that instead of listing unrelated work.
 * One live region, always mounted, announces results.
 */

/** The illustration the old search showed when nothing fit: still looking, a frown in the lens. */
const NO_RESULTS_ART = '/images/404/404-ai.png'

interface SearchResult {
  slug: string
  href: string
  title: string
  caption: string
  image?: string
  imageAspect?: number
  imageEdges?: PictureEdges
  imageTint?: string
  imageFocus?: PictureFocus
  imagePosition?: string
  kind?: 'work' | 'vision'
  blurb?: string
  blurbSource?: 'ai' | 'caption'
  fit?: 'direct' | 'adjacent'
  anchorTitle?: string
}

interface SearchResponse {
  results: SearchResult[]
  aiGenerated: boolean
  insight?: string | null
  gapNote?: string | null
  alsoRelated?: SearchResult[]
  reason?: 'no-matches' | 'ai-unavailable' | 'rate-limited' | 'instant'
  error?: string
}

export function HomeSearch({ onAsked }: { onAsked?: (query: string) => void } = {}) {
  const reduced = useReducedMotion() ?? false
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [loading, setLoading] = useState(false)
  const [provisional, setProvisional] = useState<SearchResult[] | null>(null)
  const [response, setResponse] = useState<SearchResponse | null>(null)
  const [failed, setFailed] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const form = useRef<HTMLFormElement | null>(null)
  const field = useRef<HTMLTextAreaElement | null>(null)

  // The box wraps and grows with what is in it, so a phone shows the whole question.
  useLayoutEffect(() => {
    const box = field.current
    if (!box) return
    box.style.height = 'auto'
    box.style.height = `${box.scrollHeight}px`
  }, [input])

  async function run(query: string, via: SearchVia = 'typed') {
    const trimmed = query.trim()
    if (trimmed.length < 2) return
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller
    setInput(trimmed)
    setSubmitted(trimmed)
    onAsked?.(trimmed)
    setLoading(true)
    setFailed(false)
    setResponse(null)
    setProvisional(null)
    // The question stays in view at the top, with the answer (or "No results") under it.
    requestAnimationFrame(() => form.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' }))

    // Review only (the route ignores it in production): ?search-state=ai-unavailable|rate-limited|error.
    const simulate = new URLSearchParams(location.search).get('search-state') || undefined
    const post = (body: object) => fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, via, simulate }), signal: controller.signal })
    // First paint: the keyword pass, shown only until the AI answer lands.
    post({ query: trimmed, instant: true })
      .then(async res => {
        if (!res.ok) return
        const data = (await res.json()) as SearchResponse
        setProvisional(current => (current === null && controller === abort.current ? data.results : current))
      })
      .catch(() => {})
    try {
      const res = await post({ query: trimmed })
      const data = (await res.json()) as SearchResponse
      if (!res.ok) throw new Error(data.error || `search failed (${res.status})`)
      setResponse(data)
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setFailed(true)
    } finally {
      if (abort.current === controller) { setLoading(false); setProvisional(null) }
    }
  }

  /** The line's suggestion, put in the box to edit or send as it is. */
  function fillSuggestion() {
    setInput(LINE_SUGGESTION.query)
    requestAnimationFrame(() => {
      const input = field.current
      if (!input) return
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    })
  }

  function clear() {
    abort.current?.abort()
    setInput(''); setSubmitted(''); setResponse(null); setProvisional(null); setFailed(false); setLoading(false)
  }

  const answered = submitted.length > 0 && input.trim() === submitted && !loading
  const allAdjacent = !!response && response.results.length > 0 && response.results.every(result => result.fit === 'adjacent')
  const status = loading ? 'Searching our work…' : failed ? 'Search failed. Try again.' : response
    ? response.results.length > 0 ? `${response.results.length} ${response.results.length === 1 ? 'result' : 'results'} for ${submitted}` : 'No strong matches for that search.'
    : ''

  return (
    <Section id="ask" aria-labelledby="ask-title" data-home-search>
      <div className="grid items-end gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
        <div>
          <p className={cn('mb-6 mt-0', type.label)}>Ask about our work</p>
          <SectionHeading id="ask-title" sweep reduced={reduced} text="Not on the list? Describe yours." className="max-w-[12ch]" />
        </div>
        <p className={cn('m-0 max-w-[40ch]', type.lead)}>Tell us what you’re up against, in your own words. We’ll find the work of ours that comes closest.</p>
      </div>

      <form ref={form} role="search" className="relative z-10 mt-12 scroll-mt-24 md:mt-16" onSubmit={event => { event.preventDefault(); run(input, input.trim() === LINE_SUGGESTION.query ? 'line-suggestion' : 'typed') }}>
        <label htmlFor="ask-input" className="sr-only">Describe what you’re working on</label>
        <div className="flex items-end gap-6 border-b-2 border-current focus-within:border-secondary">
          {/* A text area, so the question wraps (a phone shows all of it); Enter still searches
              and a pasted line break becomes a space. Empty, the line shows a suggestion, drawn
              as text with the box laid over it, since a placeholder does not grow the box; the
              placeholder still carries it for screen readers. */}
          <div className="relative min-w-0 flex-1">
            {input === '' && <span aria-hidden data-line-suggestion className={cn('pointer-events-none block select-none py-4 text-gray', type.title)}>{LINE_SUGGESTION.query}</span>}
            <textarea
              ref={field} id="ask-input" rows={1} value={input} maxLength={200} autoComplete="off" enterKeyHint="search"
              onChange={event => setInput(event.target.value.replace(/\s*\n\s*/g, ' '))}
              onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); form.current?.requestSubmit() } }}
              placeholder={LINE_SUGGESTION.query}
              aria-describedby="ask-note"
              className={cn('block w-full resize-none overflow-hidden border-0 bg-transparent py-4 text-inherit outline-none placeholder:text-transparent', input === '' && 'absolute inset-x-0 top-0', type.title)}
            />
          </div>
          {/* The button for the line's state: the suggestion goes in the box (edit it, or press
              Enter), a search, or clear. Keyed apart, so a press never lands on the button that
              replaces it (React would reuse the element, and a type="submit" swapped in
              mid-click submits the form). */}
          {answered
            ? <button key="clear" type="button" onClick={clear} className={cn(textLinkClass, 'mb-3 shrink-0 border-0 bg-transparent p-0', type.label)}><span data-link-label className="group-hover:underline">Clear</span></button>
            : input === ''
            ? <button key="use" type="button" data-use-suggestion onClick={fillSuggestion} aria-label={`Use this suggestion: ${LINE_SUGGESTION.query}`} className={cn(textLinkClass, 'mb-3 shrink-0 border-0 bg-transparent p-0', type.label)}><span data-link-label className="group-hover:underline group-focus-visible:underline">Use this</span></button>
            : <button key="search" type="submit" className={cn(textLinkClass, 'mb-3 shrink-0 border-0 bg-transparent p-0', type.label)}><span data-link-label className="group-hover:underline group-focus-visible:underline">Search</span><Arrow /></button>}
        </div>
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <p data-search-examples className={cn('m-0 flex flex-wrap items-baseline gap-x-5', type.label)}>
            <span data-hand-note className="text-gray">Or try</span>
            {EXAMPLE_QUERIES.map(example => <button key={example.label} type="button" onClick={() => run(example.query, 'example')} className={cn('min-h-12 cursor-pointer border-0 bg-transparent p-0 text-left text-inherit underline decoration-1 underline-offset-4 hover:text-secondary', focusRing)}>{example.label}</button>)}
          </p>
          <p id="ask-note" className={cn('m-0 text-gray', type.caption)}>Experimental: an AI reads what you type and answers only from our published work.</p>
        </div>
      </form>

      {/* Always mounted: only its text changes, so screen readers announce it reliably. */}
      <div aria-live="polite" className="sr-only">{status}</div>

      <div>
        {loading && (provisional && provisional.length > 0
          ? <Results label="First matches" note="Narrowing these down and writing why each fits…" items={provisional.slice(0, 6)} faded />
          : <Skeleton />)}

        {!loading && failed && <EmptyState kind="error" title="Search failed" note="Something broke on our side." run={run} retry={() => run(submitted, 'retry')} />}

        {!loading && response && response.results.length === 0 && <EmptyState kind="none" title="No results" note={response.gapNote || 'Nothing we’ve published fits that closely.'} run={run} />}

        {!loading && response && response.results.length > 0 && <>
          <Results
            label={!response.aiGenerated ? 'Keyword matches' : allAdjacent ? 'Closest related work' : 'Recommended for you'}
            statement={response.aiGenerated ? response.gapNote || response.insight || undefined : undefined}
            note={!response.aiGenerated ? fallbackNote(response.reason, submitted) : undefined}
            items={response.results}
          />
          {response.alsoRelated && response.alsoRelated.length > 0 && <Results label="Also related" items={response.alsoRelated} quiet />}
          <ToContact />
        </>}
      </div>
    </Section>
  )
}

/** The way on from an answer: the contact form, which already holds their words, and the
 * whole portfolio. */
function ToContact() {
  return (
    <div className="mt-12 flex flex-wrap items-baseline gap-x-10 gap-y-4">
      <p className={cn('m-0', type.label)}><TextLink href="#contact" data-search-to-contact>Tell us about yours</TextLink> <span className="text-gray">Your words are already in the form.</span></p>
      <TextLink href="/work" className={type.label}>See all the work</TextLink>
    </div>
  )
}

/** Why these are plain keyword matches: said plainly, with what is missing and what to do. */
function fallbackNote(reason: SearchResponse['reason'], query: string) {
  return reason === 'rate-limited'
    ? `You’ve searched a lot in a short time, so the AI is sitting this one out. These are plain keyword matches for “${query}”, without the reasons why. Give it a minute.`
    : `Our AI isn’t answering right now, so these are plain keyword matches for “${query}”, without the reasons why. Try again in a while.`
}

/** The answer, weighted roughly 70 / 20 / 10: the best match as a feature (its picture
 * runs off the left edge and takes most of the width), the rest as cards with their
 * pictures, then anything "also related" as a quiet list. The label and the AI's one-line
 * read of the question sit beside the top of the feature's picture, so the picture starts
 * right under the question and the whole best match fits the first screen. */
function Results({ label, statement, note, items, faded = false, quiet = false }: { label: string; statement?: string; note?: string; items: SearchResult[]; faded?: boolean; quiet?: boolean }) {
  if (quiet) return (
    <div data-search-results="also" className="mt-20 md:mt-28">
      <p data-hand-note className={cn('m-0', type.label)}>{label}</p>
      <ul className="m-0 mt-4 grid list-none gap-x-16 p-0 md:grid-cols-2">{items.map(item => <li key={item.slug}><RelatedRow item={item} /></li>)}</ul>
    </div>
  )
  const [lead, ...rest] = items
  const block = leadBlockColor(lead.imageTint)
  return (
    <div data-search-results="main" className={cn('mt-10 grid gap-y-6 md:mt-12 md:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] md:gap-x-12', faded && 'opacity-60 transition-opacity duration-300 motion-reduce:transition-none')}>
      <div className="md:col-start-2 md:row-start-1">
        <p data-hand-note className={cn('m-0 text-secondary', type.label)}>{label}</p>
        {statement && <p className={cn('mb-0 mt-3', type.lead)}>{statement}</p>}
        {note && <p className={cn('mb-0 mt-3 text-gray', type.body)}>{note}</p>}
      </div>
      {/* The picture is a second way into the same page, so it stays out of the tab order and the accessibility tree. */}
      <ResultLink item={lead} hidden className="md:col-start-1 md:row-span-2 md:row-start-1 md:self-end">
        <ResultPicture item={lead} frame={FEATURE_FRAME} sizes="(min-width:768px) 62vw, 100vw" className="-mx-12 md:-ml-[6vw] md:mr-0" feature />
      </ResultLink>
      {/* The lead's words sit on a block of its picture's own colour, butted against the
          picture and running off the right edge as the picture runs off the left: one band,
          so the eye lands there first. The padding keeps the words where they were. Grey
          text cannot hold its contrast on a colour, so the caption is ink here. */}
      <article data-search-feature data-lead-block={block ?? 'plain'} style={{ backgroundColor: block }} className="-mx-12 -mt-6 bg-tertiary-lightest px-12 py-10 md:col-start-2 md:row-start-2 md:-ml-12 md:-mr-[6vw] md:mt-0 md:self-end md:py-12 md:pl-12 md:pr-[6vw]">
        <ResultLink item={lead} className="block">
          <p className={cn('m-0', type.caption)}>01 · {kindOf(lead)}</p>
          <h3 className={cn('mb-0 mt-3 transition-colors duration-300 group-hover:text-secondary motion-reduce:transition-none', type.title)}><span data-link-label>{lead.title}</span></h3>
          <p className={cn('mb-0 mt-5', type.body)}>{lead.blurb || lead.caption}</p>
          <p className={cn('mb-0 mt-6 flex items-center gap-3', type.label)}><span>{opensAt(lead)}</span><span className={nudge}><Arrow /></span></p>
        </ResultLink>
      </article>
      {rest.length > 0 && <ol start={2} className={cn('m-0 mt-10 grid list-none gap-x-10 gap-y-14 p-0 md:col-span-full md:mt-16 md:grid-cols-2', rest.length > 2 && 'lg:grid-cols-3')}>
        {rest.map((item, index) => <li key={item.slug}><CardResult item={item} index={index + 1} /></li>)}
      </ol>}
    </div>
  )
}

/** Our own page, by the kind of link it needs. A link to a section uses a full
 * navigation: the browser's own scroll to the fragment lands reliably, where a
 * client navigation loses it to the page's reveals. */
function ResultLink({ item, className, children, hidden = false }: { item: SearchResult; className: string; children: ReactNode; hidden?: boolean }) {
  const classes = cn('group text-inherit no-underline', focusRing, className)
  const extra = hidden ? { tabIndex: -1, 'aria-hidden': true } : {}
  if (item.href.startsWith('http')) return <a href={item.href} target="_blank" rel="noopener noreferrer" className={classes} {...extra}>{children}</a>
  if (item.href.includes('#')) return <a href={item.href} className={classes} {...extra}>{children}</a>
  return <Link href={item.href} className={classes} {...extra}>{children}</Link>
}

const kindOf = (item: SearchResult) => `${item.kind === 'vision' ? 'Vision' : 'Case study'}${item.fit === 'adjacent' ? ' · Related, not exact' : ''}`
const nudge = 'transition-transform duration-300 group-hover:translate-x-2 group-focus-visible:translate-x-2 motion-reduce:transition-none'
const lift = 'transition-transform duration-700 ease-out-expo group-hover:scale-[1.03] motion-reduce:transition-none'
const opensAt = (item: SearchResult) => item.anchorTitle ? `Opens at “${item.anchorTitle}”` : item.kind === 'vision' ? 'Read it' : 'Read the case study'

/** Frames, width over height. */
const FEATURE_FRAME = SEARCH_PICTURE_FRAME
const CARD_FRAME = SEARCH_PICTURE_FRAME

/** Fills its frame, positioned as the editor set it for the site's cards. A picture that
 * would lose more than a quarter of itself (picture.ts) shows whole instead, on a block of
 * its own edge colours, so the frame still reads as full and nothing is cut mid-word. */
function ResultPicture({ item, frame, sizes, className, feature = false }: { item: SearchResult; frame: number; sizes: string; className?: string; feature?: boolean }) {
  const fit = pictureFit(item.imageAspect, frame)
  return (
    <div data-search-picture={feature ? 'feature' : 'card'} data-picture-fit={fit} data-picture-block={fit === 'whole' && item.imageEdges ? item.imageEdges.side : undefined} style={{ aspectRatio: frame, background: fit === 'whole' ? edgeBlock(item.imageEdges) : undefined }} className={cn('relative overflow-hidden bg-tertiary-lightest', className)}>
      {item.image && <Image src={item.image} alt="" fill sizes={sizes} style={fit === 'fill' ? { objectPosition: focusPosition(item.imageFocus, item.imagePosition) } : undefined} className={cn(fit === 'whole' ? 'object-contain' : 'object-cover', lift)} />}
    </div>
  )
}

/** The rest: a card each, picture first. */
function CardResult({ item, index }: { item: SearchResult; index: number }) {
  return (
    <ResultLink item={item} className="block">
      <ResultPicture item={item} frame={CARD_FRAME} sizes="(min-width:1024px) 30vw, (min-width:768px) 45vw, 90vw" />
      <p className={cn('mb-0 mt-5 text-gray', type.caption)}>{String(index + 1).padStart(2, '0')} · {kindOf(item)}</p>
      <h3 className={cn('mb-0 mt-2 transition-colors duration-300 group-hover:text-secondary motion-reduce:transition-none', type.quote)}><span data-link-label>{item.title}</span></h3>
      <p className={cn('mb-0 mt-3 line-clamp-4', type.body)}>{item.blurb || item.caption}</p>
      <p className={cn('mb-0 mt-4 flex items-center gap-3', type.label)}><span>{opensAt(item)}</span><span className={nudge}><Arrow /></span></p>
    </ResultLink>
  )
}

/** Quieter: a title and an arrow, two to a row. */
function RelatedRow({ item }: { item: SearchResult }) {
  return (
    <ResultLink item={item} className="flex items-start justify-between gap-6 border-t border-black/15 py-5">
      <span>
        <span className={cn('block text-gray', type.caption)}>{kindOf(item)}</span>
        <span className={cn('mt-1 block transition-colors duration-300 group-hover:text-secondary motion-reduce:transition-none', type.quote)}>{item.title}</span>
      </span>
      <span className={cn('mt-6 shrink-0', nudge)}><Arrow /></span>
    </ResultLink>
  )
}

/** The answer's shape while it is being found: a feature and two cards. */
function Skeleton() {
  return (
    <div aria-hidden="true" className="mt-10 md:mt-12">
      <div className="grid animate-pulse gap-y-6 motion-reduce:animate-none md:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] md:gap-x-12">
        <p className={cn('m-0 text-secondary md:col-start-2 md:row-start-1', type.label)}>Searching our work…</p>
        <div style={{ aspectRatio: FEATURE_FRAME }} className="-mx-12 bg-tertiary-lightest md:col-start-1 md:row-span-2 md:row-start-1 md:-ml-[6vw] md:mr-0" />
        <div className="space-y-4 md:col-start-2 md:row-start-2 md:self-end"><div className="h-4 w-24 bg-tertiary-lightest" /><div className="h-10 w-5/6 bg-tertiary-lightest" /><div className="h-4 w-full bg-tertiary-lightest" /><div className="h-4 w-2/3 bg-tertiary-lightest" /></div>
      </div>
      <div className="mt-10 grid animate-pulse gap-x-10 gap-y-14 motion-reduce:animate-none md:mt-16 md:grid-cols-2">
        {[0, 1].map(index => <div key={index} className="space-y-4"><div style={{ aspectRatio: CARD_FRAME }} className="bg-tertiary-lightest" /><div className="h-4 w-24 bg-tertiary-lightest" /><div className="h-7 w-3/4 bg-tertiary-lightest" /></div>)}
      </div>
    </div>
  )
}

/** Nothing to show, for either reason: nothing fits, or the search failed. The old search's
 * illustration, large enough to own the moment, and beside it the words and searches that do
 * have answers (stored, so they come back at once, even while the search itself is failing),
 * quoted as the page quotes a reader's concerns. */
function EmptyState({ kind, title, note, run, retry }: { kind: 'none' | 'error'; title: string; note: string; run: (query: string, via: SearchVia) => void; retry?: () => void }) {
  return (
    <div data-search-empty={kind} className="mt-12 lg:mt-8">
      {/* Roughly 70 / 20 / 10: the girl carries the block, the words come second, the
          suggestions after. The art is cropped to her (the file's empty top and right are
          cut away, never her) and runs off the page's right edge; it fades in at the top and
          out at the bottom. Everything else is one column on her empty left side, bottom-
          aligned with her, so the suggestions sit above the fold. Its width is what her empty side
          leaves (her face starts 1.536 × her height in from the right edge), so a short window,
          where she is smaller, gives the words more room. Her height (--art-h) is the smallest of:
          the window less the search above and the prompt's band below, 46% of the width, and
          what still leaves the column about 26rem. A tablet stacks, like a phone. Her height leaves a band
          free at the bottom of the window for the next-section prompt. */}
      <div className="relative [--art-h:min(100svh_-_23rem,_46vw,_(94vw_-_28.75rem)_/_1.536)] lg:flex lg:min-h-(--art-h) lg:flex-col lg:justify-end">
        <div data-search-empty-art className="pointer-events-none relative -mx-12 aspect-[2788/1444] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_74%,transparent)] lg:absolute lg:bottom-0 lg:right-[-6vw] lg:mx-0 lg:h-(--art-h)">
          <Image src={cloudfrontImage(NO_RESULTS_ART)} alt="" width={3168} height={1536} sizes="(min-width:768px) 90vw, 115vw" className="absolute bottom-0 left-0 h-auto w-[113.64%] max-w-none" />
        </div>
        <div data-search-empty-words className="relative z-10 -mt-[6vw] lg:mt-0 lg:w-[min(94vw_-_1.536_*_var(--art-h)_-_2.5rem,_40rem)]">
          <p className={cn('m-0', type.heading)}>{title}</p>
          <p className={cn('mb-0 mt-4 max-w-[34ch]', type.lead)}>
            {note}
            {retry && <> <button type="button" onClick={retry} className={cn(textLinkClass, 'cursor-pointer border-0 bg-transparent p-0 align-baseline text-secondary', type.lead)}><span data-link-label className="underline underline-offset-4">Try again</span><Arrow /></button></>}
          </p>
          <div className="mt-10 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <p data-hand-note className={cn('m-0 text-gray', type.label)}>Try one of these</p>
            <TextLink href="/work" className={type.label}>Or browse all the work</TextLink>
          </div>
          <ul className="m-0 mt-3 list-none p-0">
            {SUGGESTED_QUERIES.map(item => <li key={item.query}>
              <button type="button" data-rule onClick={() => run(item.query, 'empty-suggestion')} className={cn('group flex w-full cursor-pointer items-baseline justify-between gap-6 border-x-0 border-b-0 border-t border-solid border-black/15 bg-transparent px-0 py-3 text-left text-inherit', focusRing)}>
                <span className={cn('transition-colors duration-300 group-hover:text-secondary motion-reduce:transition-none', type.lead)}>“{item.label}”</span>
                <span className={cn('shrink-0', nudge)}><Arrow /></span>
              </button>
            </li>)}
          </ul>
          <p className={cn('mb-0 mt-6', type.label)}><TextLink href="#contact" data-search-to-contact>Or tell us about yours</TextLink> <span className="text-gray">Your words are already in the form.</span></p>
        </div>
      </div>
    </div>
  )
}
