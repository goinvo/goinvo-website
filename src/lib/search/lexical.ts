import type { SearchIndexItem } from './index'

/**
 * Lexical recall: cheap keyword scoring that shortlists candidates for the
 * Claude selection stage. Strictly zero-score-excluded — a query that matches
 * nothing returns an empty list (never padded with irrelevant projects; the
 * Gatsby prototype's "top 8 anyway" fallback is what made nonsense queries
 * embarrassing).
 *
 * Domain expansion (from the persona study): healthcare buyers type the
 * field's abbreviations ("SDOH", "ePRO", "CDS") while captions spell things
 * out — and a starved shortlist doesn't just hide assets, it pushes the AI
 * stage toward inventing relevance in whatever it did receive. Query tokens
 * expand into corpus phrasings before scoring.
 */

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'for', 'from',
  'get', 'goes', 'has', 'have', 'help', 'how', 'i', 'in', 'is', 'it', 'me',
  'my', 'need', 'of', 'on', 'or', 'our', 'show', 'that', 'the', 'their',
  'this', 'to', 'us', 'want', 'we', 'what', 'where', 'which', 'who', 'with',
  'you', 'your',
])

/** Query-side expansions: abbreviation → phrasings that appear in the corpus.
 * Conservative by design — every value should be vocabulary a caption might
 * actually contain. */
const EXPANSIONS: Record<string, string[]> = {
  sdoh: ['social determinants', 'determinants of health'],
  epro: ['patient-reported outcome', 'patient reported outcome'],
  pros: ['patient-reported outcome'],
  cds: ['clinical decision support', 'decision support'],
  cdss: ['clinical decision support'],
  ehr: ['electronic health record', 'health record'],
  emr: ['electronic health record', 'health record'],
  ehrs: ['electronic health record'],
  hie: ['health information exchange'],
  hfe: ['human factors'],
  ifu: ['instructions for use'],
  auth: ['authorization'],
  lep: ['limited english', 'language'],
  dta: ['transitional assistance', 'snap'],
  genai: ['generative ai', 'ai'],
  llm: ['ai', 'natural language'],
  ml: ['ai'],
  dataviz: ['visualization', 'data visualization'],
  viz: ['visualization'],
  infographic: ['visualization'],
  infographics: ['visualization'],
}

export function tokenize(query: string): string[] {
  return String(query || '')
    .toLowerCase()
    .replace(/[^a-z0-9()\s-]/g, ' ')
    .replace(/[()]/g, ' ')
    .split(/[\s-]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
}

/** Tokens plus the corpus phrasings they expand to. */
export function expandTokens(tokens: string[]): { tokens: string[]; phrases: string[] } {
  const phrases = new Set<string>()
  for (const token of tokens) {
    for (const phrase of EXPANSIONS[token] ?? []) phrases.add(phrase)
  }
  return { tokens, phrases: Array.from(phrases) }
}

export interface ScoredItem {
  item: SearchIndexItem
  score: number
}

interface ItemFields {
  title: string
  clientName: string
  categories: string
  caption: string
  keywords: string
}

function fieldsOf(item: SearchIndexItem): ItemFields {
  return {
    title: item.title.toLowerCase(),
    clientName: (item.client ?? '').toLowerCase(),
    categories: item.categories.join(' ').toLowerCase(),
    caption: item.caption.toLowerCase(),
    keywords: (item.keywords ?? []).join(' ').toLowerCase(),
  }
}

function scoreTerm(term: string, f: ItemFields): number {
  let score = 0
  if (f.title.includes(term)) score += 3
  if (f.clientName.includes(term)) score += 2
  if (f.categories.includes(term)) score += 2
  if (f.keywords.includes(term)) score += 2
  if (f.caption.includes(term)) score += 1
  return score
}

export function scoreItem(tokens: string[], item: SearchIndexItem): number {
  if (tokens.length === 0) return 0
  const { phrases } = expandTokens(tokens)
  const f = fieldsOf(item)

  let score = 0
  for (const token of tokens) score += scoreTerm(token, f)
  for (const phrase of phrases) score += scoreTerm(phrase, f)
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
