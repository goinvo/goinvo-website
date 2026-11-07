import data from './suggested.json'

/**
 * Searches we offer the reader (the homepage's examples, and the suggestions shown
 * when a search finds nothing) with their answers stored, so they come back at once
 * and cost no model call. The answers are the real pipeline's output (selection,
 * grounding guard and all), written by `node scripts/build-search-suggestions.mjs`.
 * Re-run it when the portfolio changes. tests/search-suggestions.test.ts fails on a
 * suggestion without a stored answer.
 */

export interface SuggestedQuery {
  label: string
  query: string
  /** example: a shortcut beside the search box; empty: offered when nothing fits. */
  use: 'example' | 'empty'
}

export const SUGGESTED_QUERIES = data.queries as SuggestedQuery[]
export const EXAMPLE_QUERIES = SUGGESTED_QUERIES.filter(item => item.use === 'example')
export const EMPTY_STATE_QUERIES = SUGGESTED_QUERIES.filter(item => item.use === 'empty')

/** Case, spacing and trailing punctuation never make a different question. */
export function normalizeQuery(query: string): string {
  return query.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim().replace(/[?.!]+$/, '')
}

const answers = data.answers as Record<string, unknown>

/** The stored answer for one of the suggested searches, if this is one. */
export function storedAnswer(query: string): Record<string, unknown> | null {
  const answer = answers[normalizeQuery(query)]
  return answer && typeof answer === 'object' ? (answer as Record<string, unknown>) : null
}
