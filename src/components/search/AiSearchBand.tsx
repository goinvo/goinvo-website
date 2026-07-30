'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

/**
 * Homepage AI search band — Next.js port of the Gatsby `redesign-ai-search-layout`
 * prototype. Sector buttons fire example queries; free text hits /api/search
 * (lexical recall + Claude selection with tailored blurbs). All fallback states
 * are honest: keyword-only results are labeled as such, and a query that
 * matches nothing says so instead of listing unrelated work.
 */

const SECTORS = [
  { label: 'Enterprise', query: 'enterprise analytics platform' },
  { label: 'Healthcare', query: 'healthcare software' },
  { label: 'Government', query: 'public sector service design' },
  { label: 'AI', query: 'AI LLM NLP healthcare' },
]

interface SearchResult {
  slug: string
  href: string
  title: string
  caption: string
  image?: string
  blurb?: string
}

interface SearchResponse {
  results: SearchResult[]
  aiGenerated: boolean
  insight?: string | null
  reason?: 'no-matches' | 'ai-unavailable' | 'rate-limited'
  error?: string
}

export function AiSearchBand() {
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<SearchResponse | null>(null)
  const [failed, setFailed] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const resultsRef = useRef<HTMLDivElement | null>(null)

  async function runSearch(query: string) {
    const trimmed = query.trim()
    if (trimmed.length < 2) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setInput(trimmed)
    setSubmitted(trimmed)
    setLoading(true)
    setFailed(false)
    setResponse(null)
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
        signal: controller.signal,
      })
      const data = (await res.json()) as SearchResponse
      if (!res.ok) throw new Error(data.error || `search failed (${res.status})`)
      setResponse(data)
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setFailed(true)
    } finally {
      if (abortRef.current === controller) setLoading(false)
    }
  }

  function clear() {
    abortRef.current?.abort()
    setInput('')
    setSubmitted('')
    setResponse(null)
    setFailed(false)
    setLoading(false)
  }

  const showClear = submitted.length > 0 && input.trim() === submitted

  return (
    <section data-experiment-section="ai-search" className="bg-primary text-white">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-14 py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-14 items-start">
          <h2 className="font-serif text-3xl lg:text-4xl leading-tight m-0">
            Our expertise in design covers&hellip;
          </h2>
          <div className="grid grid-cols-2 gap-x-8">
            {SECTORS.map((sector) => (
              <button
                key={sector.label}
                type="button"
                onClick={() => runSearch(sector.query)}
                className="text-left text-lg lg:text-xl py-3 border-b border-white/40 hover:border-white transition-colors cursor-pointer"
              >
                {sector.label}
              </button>
            ))}
          </div>
        </div>

        <form
          className="relative mt-8"
          onSubmit={(event) => {
            event.preventDefault()
            runSearch(input)
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="How can we help your next project?"
            aria-label="Search our work"
            maxLength={200}
            className="w-full rounded-full bg-white text-[#1d1b1a] placeholder:text-[#6a6560] pl-6 pr-16 py-4 text-base focus:outline-none focus:ring-2 focus:ring-white/60"
          />
          {showClear ? (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-primary text-white text-2xl leading-none hover:bg-primary-dark transition-colors cursor-pointer"
            >
              ×
            </button>
          ) : (
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-primary text-white text-xl hover:bg-primary-dark transition-colors cursor-pointer"
            >
              →
            </button>
          )}
        </form>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-white/95">Tip: click a sector above to try an example.</span>
          <span className="text-white/60 text-xs">AI search is experimental.</span>
        </div>
      </div>

      {/* Results — paper background, only rendered once a search ran */}
      {(loading || response || failed) && (
        <div ref={resultsRef} className="bg-[#fbfaf7] text-[#1d1b1a] scroll-mt-20">
          <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-14 py-12 lg:py-16">
            {loading && <ResultsSkeleton />}

            {!loading && failed && (
              <ResultsMessage title="Search hit a snag.">
                Please try again in a moment, or{' '}
                <Link href="/work" className="text-primary font-semibold">
                  browse all our work
                </Link>
                .
              </ResultsMessage>
            )}

            {!loading && response && response.results.length === 0 && (
              <ResultsMessage title="No strong matches for that search.">
                {response.insight ? `${response.insight} ` : ''}
                Try different words, or{' '}
                <Link href="/work" className="text-primary font-semibold">
                  browse all our work
                </Link>
                .
              </ResultsMessage>
            )}

            {!loading && response && response.results.length > 0 && (
              <>
                <div className="mb-8">
                  <p className="text-[11px] tracking-[0.16em] uppercase font-bold text-primary mb-2">
                    {response.aiGenerated ? 'Recommended for you' : 'Search results'}
                  </p>
                  {response.aiGenerated && response.insight && (
                    <p className="font-serif text-xl lg:text-2xl text-[#3a3633] m-0">{response.insight}</p>
                  )}
                  {!response.aiGenerated && (
                    <p className="text-sm text-[#6a6560] m-0">
                      Keyword matches for &ldquo;{submitted}&rdquo; — AI recommendations are unavailable right now.
                    </p>
                  )}
                </div>
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {response.results.map((result) => (
                    <ResultCard key={result.slug} result={result} />
                  ))}
                </div>
                <p className="mt-10 mb-0 text-sm">
                  <Link href="/work" className="text-primary font-semibold">
                    Browse all our work →
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function ResultCard({ result }: { result: SearchResult }) {
  const external = result.href.startsWith('http')
  const card = (
    <article className="h-full flex flex-col group">
      {result.image ? (
        <div className="relative aspect-[4/3] overflow-hidden bg-[#ece7dc]">
          <Image
            src={result.image}
            alt={result.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        </div>
      ) : (
        <div className="aspect-[4/3] bg-[#ece7dc]" />
      )}
      <div className="border-t border-[#1d1b1a] mt-4 pt-3 flex-1 flex flex-col">
        <h3 className="font-serif text-xl leading-snug m-0">{result.title}</h3>
        <p className="mt-2 mb-0 text-sm leading-6 text-[#3a3633]">{result.blurb || result.caption}</p>
      </div>
    </article>
  )

  return external ? (
    <a href={result.href} target="_blank" rel="noopener noreferrer" className="no-underline text-inherit">
      {card}
    </a>
  ) : (
    <Link href={result.href} className="no-underline text-inherit">
      {card}
    </Link>
  )
}

function ResultsSkeleton() {
  return (
    <div aria-live="polite">
      <p className="text-[11px] tracking-[0.16em] uppercase font-bold text-primary mb-6">
        Searching our work&hellip;
      </p>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[4/3] bg-[#ece7dc]" />
            <div className="border-t border-[#d9d3c6] mt-4 pt-3 space-y-2">
              <div className="h-5 w-3/4 bg-[#ece7dc]" />
              <div className="h-4 w-full bg-[#f4f1ea]" />
              <div className="h-4 w-2/3 bg-[#f4f1ea]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ResultsMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-[560px]">
      <h3 className="font-serif text-2xl m-0 mb-3">{title}</h3>
      <p className="m-0 text-[#3a3633] leading-7">{children}</p>
    </div>
  )
}
