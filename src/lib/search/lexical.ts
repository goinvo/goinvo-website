import type { SearchIndexItem } from './index'

/**
 * Lexical recall: cheap keyword scoring that shortlists candidates for the
 * Claude selection stage. Strictly zero-score-excluded — a query that matches
 * nothing returns an empty list (never padded with irrelevant projects; the
 * Gatsby prototype's "top 8 anyway" fallback is what made nonsense queries
 * embarrassing).
 */

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'for', 'from',
  'get', 'goes', 'has', 'have', 'help', 'how', 'i', 'in', 'is', 'it', 'me',
  'my', 'need', 'of', 'on', 'or', 'our', 'show', 'that', 'the', 'their',
  'this', 'to', 'us', 'want', 'we', 'what', 'where', 'which', 'who', 'with',
  'you', 'your',
])

export function tokenize(query: string): string[] {
  return String(query || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
}

export interface ScoredItem {
  item: SearchIndexItem
  score: number
}

export function scoreItem(tokens: string[], item: SearchIndexItem): number {
  if (tokens.length === 0) return 0
  const title = item.title.toLowerCase()
  const clientName = (item.client ?? '').toLowerCase()
  const categories = item.categories.join(' ').toLowerCase()
  const caption = item.caption.toLowerCase()

  let score = 0
  for (const token of tokens) {
    if (title.includes(token)) score += 3
    if (clientName.includes(token)) score += 2
    if (categories.includes(token)) score += 2
    if (caption.includes(token)) score += 1
  }
  return score
}

export function recall(query: string, items: SearchIndexItem[], topK = 20): ScoredItem[] {
  const tokens = tokenize(query)
  return items
    .map((item) => ({ item, score: scoreItem(tokens, item) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
