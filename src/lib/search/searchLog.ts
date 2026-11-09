/**
 * What a homepage search asked and what it answered, kept for analytics: which problems
 * people bring, which of our work answers them, where nothing fits. One record per
 * answered search (searchLog.server.ts writes it to the private dataset).
 *
 * Kept small on purpose. A visitor types free text, so anything that looks like contact
 * details is replaced before it is stored, the AI's own sentences (which may repeat the
 * question) get the same treatment, and nothing identifies the visitor: no IP, no browser,
 * no id that links one search to another.
 */
import { normalizeQuery } from './suggested'

/** How the search was started: typed, the suggestion on the empty line, an example beside
 * the box, a suggestion after "No results", or Try again after a failure. */
export const SEARCH_VIAS = ['typed', 'line-suggestion', 'example', 'empty-suggestion', 'retry'] as const
export type SearchVia = (typeof SEARCH_VIAS)[number]

export function searchVia(value: unknown): SearchVia {
  return SEARCH_VIAS.includes(value as SearchVia) ? (value as SearchVia) : 'typed'
}

/** Where the answer came from: a stored suggestion, the answer cache, a fresh AI selection,
 * plain keyword matches (the AI unavailable or rate-limited), or nothing at all. */
export type SearchSource = 'stored' | 'cache' | 'ai' | 'keyword' | 'none'

interface AnsweredItem {
  slug: string
  fit?: 'direct' | 'adjacent'
}

/** The parts of a search answer the log keeps. */
export interface SearchAnswer {
  results?: AnsweredItem[]
  alsoRelated?: AnsweredItem[]
  aiGenerated?: boolean
  reason?: string
  insight?: string | null
  gapNote?: string | null
  persona?: string | null
}

export interface SearchLogEntry {
  at: string
  env: string
  query: string
  normalized: string
  via: SearchVia
  source: SearchSource
  aiGenerated: boolean
  reason: string | null
  resultCount: number
  lead: string | null
  results: { _key: string; slug: string; rank: number; fit: string | null }[]
  alsoRelated: string[]
  insight: string | null
  gapNote: string | null
  persona: string | null
  latencyMs: number
}

const EMAIL = /[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/gi
// Seven or more digits, allowing the separators phone and account numbers use. A year
// ("2026") or a count ("15 tools") stays.
const LONG_NUMBER = /\+?\d(?:[\d\s().-]{5,}\d)/g

/** The text with contact details and long numbers replaced. */
export function redactSearchText(text: string): string {
  return text
    .replace(EMAIL, '[email]')
    .replace(LONG_NUMBER, match => (match.replace(/\D/g, '').length >= 7 ? '[number]' : match))
}

/** One search, ready to store. */
export function searchLogEntry({ query, via, source, answer, latencyMs, env, at = new Date() }: {
  query: string
  via: SearchVia
  source: SearchSource
  answer: SearchAnswer
  latencyMs: number
  env: string
  at?: Date
}): SearchLogEntry {
  const clean = redactSearchText(query).slice(0, 200)
  const results = (answer.results ?? []).map((item, index) => ({ _key: `r${index}`, slug: item.slug, rank: index + 1, fit: item.fit ?? null }))
  const text = (value?: string | null) => (value ? redactSearchText(value) : null)
  return {
    at: at.toISOString(),
    env,
    query: clean,
    normalized: normalizeQuery(clean),
    via,
    source,
    aiGenerated: answer.aiGenerated === true,
    reason: answer.reason ?? null,
    resultCount: results.length,
    lead: results[0]?.slug ?? null,
    results,
    alsoRelated: (answer.alsoRelated ?? []).map(item => item.slug),
    insight: text(answer.insight),
    gapNote: text(answer.gapNote),
    persona: answer.persona ?? null,
    latencyMs: Math.max(0, Math.round(latencyMs)),
  }
}
