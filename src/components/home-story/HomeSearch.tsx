'use client'

import { useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cloudfrontImage, cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/motion'
import { type } from '@/components/ui/type'
import { Arrow } from '@/components/ui/Arrow'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { TextLink, focusRing, textLinkClass } from '@/components/ui/TextLink'
import { EMPTY_STATE_QUERIES, EXAMPLE_QUERIES } from '@/lib/search/suggested'

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

export function HomeSearch() {
  const reduced = useReducedMotion() ?? false
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [loading, setLoading] = useState(false)
  const [provisional, setProvisional] = useState<SearchResult[] | null>(null)
  const [response, setResponse] = useState<SearchResponse | null>(null)
  const [failed, setFailed] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const results = useRef<HTMLDivElement | null>(null)

  async function run(query: string) {
    const trimmed = query.trim()
    if (trimmed.length < 2) return
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller
    setInput(trimmed)
    setSubmitted(trimmed)
    setLoading(true)
    setFailed(false)
    setResponse(null)
    setProvisional(null)
    requestAnimationFrame(() => results.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' }))

    const post = (body: object) => fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal })
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

      <form role="search" className="mt-12 md:mt-16" onSubmit={event => { event.preventDefault(); run(input) }}>
        <label htmlFor="ask-input" className="sr-only">Describe what you’re working on</label>
        <div className="flex items-end gap-6 border-b-2 border-current focus-within:border-secondary">
          <input
            id="ask-input" type="text" value={input} maxLength={200} autoComplete="off" enterKeyHint="search"
            onChange={event => setInput(event.target.value)}
            placeholder="Clinicians don’t trust our AI’s suggestions"
            aria-describedby="ask-note"
            className={cn('min-w-0 flex-1 border-0 bg-transparent py-4 text-inherit outline-none placeholder:text-gray', type.title)}
          />
          {answered
            ? <button type="button" onClick={clear} className={cn(textLinkClass, 'mb-3 shrink-0 border-0 bg-transparent p-0', type.label)}><span data-link-label className="group-hover:underline">Clear</span></button>
            : <button type="submit" className={cn(textLinkClass, 'mb-3 shrink-0 border-0 bg-transparent p-0', type.label)}><span data-link-label className="group-hover:underline group-focus-visible:underline">Search</span><Arrow /></button>}
        </div>
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <p className={cn('m-0 flex flex-wrap items-baseline gap-x-5', type.label)}>
            <span data-hand-note className="text-gray">Or try</span>
            {EXAMPLE_QUERIES.map(example => <button key={example.label} type="button" onClick={() => run(example.query)} className={cn('min-h-12 cursor-pointer border-0 bg-transparent p-0 text-inherit underline decoration-1 underline-offset-4 hover:text-secondary', focusRing)}>{example.label}</button>)}
          </p>
          <p id="ask-note" className={cn('m-0 text-gray', type.caption)}>Experimental. It answers from our published work only.</p>
        </div>
      </form>

      {/* Always mounted: only its text changes, so screen readers announce it reliably. */}
      <div aria-live="polite" className="sr-only">{status}</div>

      <div ref={results} className="scroll-mt-28">
        {loading && (provisional && provisional.length > 0
          ? <Results label="First matches" note="Narrowing these down and writing why each fits…" items={provisional.slice(0, 6)} faded />
          : <Skeleton />)}

        {!loading && failed && <Message title="The search hit a snag.">Try again in a moment, or browse the work instead.</Message>}

        {!loading && response && response.results.length === 0 && <NoResults note={response.gapNote} run={run} />}

        {!loading && response && response.results.length > 0 && <>
          <Results
            label={!response.aiGenerated ? 'Keyword matches' : allAdjacent ? 'Closest related work' : 'Recommended for you'}
            statement={response.aiGenerated ? response.gapNote || response.insight || undefined : undefined}
            note={!response.aiGenerated ? `Matches for “${submitted}”. The AI recommendations are unavailable right now.` : undefined}
            items={response.results}
          />
          {response.alsoRelated && response.alsoRelated.length > 0 && <Results label="Also related" items={response.alsoRelated} quiet />}
          <TextLink href="/work" className="mt-12">See all the work</TextLink>
        </>}
      </div>
    </Section>
  )
}

/** A heading row in the page's section grid: the label on the left, the AI's line beside it. */
function Results({ label, statement, note, items, faded = false, quiet = false }: { label: string; statement?: string; note?: string; items: SearchResult[]; faded?: boolean; quiet?: boolean }) {
  return (
    <div data-search-results={quiet ? 'also' : 'main'} className={cn('mt-16 md:mt-24', faded && 'opacity-60 transition-opacity duration-300 motion-reduce:transition-none')}>
      <div className="grid items-baseline gap-3 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
        <p data-hand-note className={cn('m-0', type.label, !quiet && 'text-secondary')}>{label}</p>
        {(statement || note) && <div>
          {statement && <p className={cn('m-0 max-w-[48ch]', type.lead)}>{statement}</p>}
          {note && <p className={cn('m-0 max-w-[60ch] text-gray', type.body)}>{note}</p>}
        </div>}
      </div>
      {quiet
        ? <ul className="m-0 mt-6 grid list-none gap-x-16 p-0 md:grid-cols-2">{items.map(item => <li key={item.slug}><RelatedRow item={item} /></li>)}</ul>
        : <ol className="m-0 mt-8 list-none p-0">{items.map((item, index) => <li key={item.slug}><ResultRow item={item} index={index} /></li>)}</ol>}
    </div>
  )
}

/** Our own page, by the kind of link it needs. A link to a section uses a full
 * navigation: the browser's own scroll to the fragment lands reliably, where a
 * client navigation loses it to the page's reveals. */
function ResultLink({ item, className, children }: { item: SearchResult; className: string; children: ReactNode }) {
  const classes = cn('group text-inherit no-underline', focusRing, className)
  if (item.href.startsWith('http')) return <a href={item.href} target="_blank" rel="noopener noreferrer" className={classes}>{children}</a>
  if (item.href.includes('#')) return <a href={item.href} className={classes}>{children}</a>
  return <Link href={item.href} className={classes}>{children}</Link>
}

const kindOf = (item: SearchResult) => `${item.kind === 'vision' ? 'Vision' : 'Case study'}${item.fit === 'adjacent' ? ' · Related, not exact' : ''}`
const nudge = 'transition-transform duration-300 group-hover:translate-x-2 group-focus-visible:translate-x-2 motion-reduce:transition-none'

/** One result as an index entry: number, title, why it fits, where it opens; the picture beside. */
function ResultRow({ item, index }: { item: SearchResult; index: number }) {
  return (
    <ResultLink item={item} className="grid gap-6 border-t border-black/15 py-8 md:grid-cols-[4rem_minmax(0,1fr)_minmax(0,17rem)] md:gap-10 md:py-10">
      <span aria-hidden="true" className="hidden font-serif text-[clamp(28px,2.4vw,40px)] leading-none text-gray tabular-nums md:block">{String(index + 1).padStart(2, '0')}</span>
      <div className="min-w-0">
        <p className={cn('m-0 text-gray', type.caption)}>{kindOf(item)}</p>
        <h3 className={cn('mb-0 mt-2 max-w-[26ch] transition-colors duration-300 group-hover:text-secondary motion-reduce:transition-none', type.title)}><span data-link-label>{item.title}</span></h3>
        <p className={cn('mb-0 mt-4 max-w-[60ch]', type.body)}>{item.blurb || item.caption}</p>
        <p className={cn('mb-0 mt-5 flex items-center gap-3', type.label)}>
          <span>{item.anchorTitle ? `Opens at “${item.anchorTitle}”` : item.kind === 'vision' ? 'Read it' : 'Read the case study'}</span>
          <span className={nudge}><Arrow /></span>
        </p>
      </div>
      <div className="relative order-first aspect-[4/3] overflow-hidden bg-tertiary-lightest md:order-none">
        {item.image && <Image src={item.image} alt="" fill sizes="(min-width:768px) 17rem, 90vw" className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04] motion-reduce:transition-none" />}
      </div>
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

function Skeleton() {
  return (
    <div aria-hidden="true" className="mt-16 md:mt-24">
      <p className={cn('m-0 text-secondary', type.label)}>Searching our work…</p>
      <div className="mt-8">
        {[0, 1, 2].map(index => <div key={index} className="grid animate-pulse gap-6 border-t border-black/10 py-8 motion-reduce:animate-none md:grid-cols-[4rem_minmax(0,1fr)_minmax(0,17rem)] md:gap-10 md:py-10">
          <div className="hidden h-8 w-10 bg-tertiary-lightest md:block" />
          <div className="space-y-4"><div className="h-4 w-24 bg-tertiary-lightest" /><div className="h-9 w-3/4 bg-tertiary-lightest" /><div className="h-4 w-full bg-tertiary-lightest" /><div className="h-4 w-2/3 bg-tertiary-lightest" /></div>
          <div className="order-first aspect-[4/3] bg-tertiary-lightest md:order-none" />
        </div>)}
      </div>
    </div>
  )
}

function Message({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-16 max-w-[44ch] md:mt-20">
      <p className={cn('m-0', type.title)}>{title}</p>
      <p className={cn('mb-4 mt-4', type.body)}>{children}</p>
      <TextLink href="/work">Browse all the work</TextLink>
    </div>
  )
}

/** Nothing fits: the illustration across the whole page, fading out at the bottom,
 * and in the fade the words, then searches that do have answers (stored, so they come
 * back at once), set as the page sets a reader's concerns: quoted, in the serif. */
function NoResults({ note, run }: { note?: string | null; run: (query: string) => void }) {
  return (
    <div data-search-empty className="mt-16 md:mt-20">
      {/* Edge to edge: out of the section's padding, and on a phone out of the page's margin too. */}
      <div className="-mx-12 md:-mx-[6vw]">
        <Image src={cloudfrontImage(NO_RESULTS_ART)} alt="" width={3168} height={1536} sizes="100vw" className="h-auto w-full [clip-path:inset(1.6%_1%_0_0)] [mask-image:linear-gradient(to_bottom,black_70%,transparent)]" />
      </div>
      <div className="relative -mt-[5vw] md:-mt-[4vw]">
        <p className={cn('m-0', type.heading)}>No results</p>
        <p className={cn('mb-0 mt-5 max-w-[48ch]', type.lead)}>{note || 'Nothing we’ve published fits that closely.'}</p>
        <p data-hand-note className={cn('mb-0 mt-14 text-gray', type.label)}>Try one of these</p>
        <ul className="m-0 mt-4 grid list-none gap-x-16 p-0 md:grid-cols-2">
          {EMPTY_STATE_QUERIES.map(item => <li key={item.query}>
            <button type="button" data-rule onClick={() => run(item.query)} className={cn('group flex w-full cursor-pointer items-start justify-between gap-6 border-x-0 border-b-0 border-t border-solid border-black/15 bg-transparent px-0 py-6 text-left text-inherit', focusRing)}>
              <span className={cn('transition-colors duration-300 group-hover:text-secondary motion-reduce:transition-none', type.quote)}>“{item.label}”</span>
              <span className={cn('mt-2 shrink-0', nudge)}><Arrow /></span>
            </button>
          </li>)}
        </ul>
        <TextLink href="/work" className="mt-6">Or browse all the work</TextLink>
      </div>
    </div>
  )
}
