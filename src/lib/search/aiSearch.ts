import Anthropic from '@anthropic-ai/sdk'
import type { SearchIndexItem } from './index'

/**
 * Claude selection + description stage. Replaces the Gatsby prototype's two
 * OpenAI functions (embeddings ranking + gpt-4.1-nano blurbs) with one call:
 * given the lexical shortlist, Claude picks the genuinely relevant projects,
 * writes a visitor-tailored blurb for each, and infers the buyer persona.
 *
 * Returns null on any failure (no key, timeout, bad JSON) — the route then
 * serves plain keyword results, clearly labeled. Never throws.
 */

const DEFAULT_MODEL = 'claude-haiku-4-5'
const TIMEOUT_MS = 12_000

export const SEARCH_PERSONAS = [
  'healthcare_executive',
  'product_manager',
  'researcher',
  'government_official',
  'startup_founder',
] as const

export interface AiSelection {
  results: { slug: string; blurb: string }[]
  insight: string | null
  persona: string | null
}

function candidateLines(candidates: SearchIndexItem[]): string {
  return candidates
    .map((c) => {
      const parts = [
        `slug: ${c.slug}`,
        `title: ${c.title}`,
        c.client ? `client: ${c.client}` : null,
        c.categories.length ? `categories: ${c.categories.join(', ')}` : null,
        c.caption ? `about: ${c.caption.slice(0, 220)}` : null,
      ].filter(Boolean)
      return `- ${parts.join(' | ')}`
    })
    .join('\n')
}

function parseJsonBlock(text: string): unknown {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('no JSON object in response')
  return JSON.parse(stripped.slice(start, end + 1))
}

export async function selectAndDescribe(
  query: string,
  candidates: SearchIndexItem[],
): Promise<AiSelection | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || candidates.length === 0) return null

  const model = process.env.AI_SEARCH_MODEL || DEFAULT_MODEL

  const prompt = [
    'You are the project-search assistant on the website of GoInvo, a healthcare UX design studio.',
    'A visitor searched our portfolio. From the candidate projects below, pick ONLY the ones that genuinely answer their query — usually 1 to 5, and zero is a valid answer if nothing truly fits.',
    '',
    `Visitor query: "${query}"`,
    '',
    'Candidate projects:',
    candidateLines(candidates),
    '',
    'Also infer which buyer persona the query most sounds like, one of:',
    SEARCH_PERSONAS.join(', '),
    'or null if unclear.',
    '',
    'Respond with STRICT JSON only, no prose, in exactly this shape:',
    '{"results":[{"slug":"...","blurb":"..."}],"insight":"...","persona":"healthcare_executive"}',
    '',
    'Rules:',
    '- "blurb": 1–2 sentences about that project, written for this visitor and their query — name the concrete thing we delivered and why it matters to them. No marketing fluff, no "This project…" openers for every item.',
    '- "insight": one short sentence summarizing what the visitor seems to be looking for. null if the query is too vague.',
    '- Order results most-relevant first. Only use slugs from the candidate list.',
  ].join('\n')

  try {
    const client = new Anthropic({ apiKey, maxRetries: 1 })
    const response = await client.messages.create(
      {
        model,
        max_tokens: 900,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    )

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
    const parsed = parseJsonBlock(text) as {
      results?: { slug?: unknown; blurb?: unknown }[]
      insight?: unknown
      persona?: unknown
    }

    const validSlugs = new Set(candidates.map((c) => c.slug))
    const results = (Array.isArray(parsed.results) ? parsed.results : [])
      .filter(
        (r): r is { slug: string; blurb: string } =>
          typeof r.slug === 'string' &&
          validSlugs.has(r.slug) &&
          typeof r.blurb === 'string' &&
          r.blurb.trim().length > 0,
      )
      .slice(0, 6)
      .map((r) => ({ slug: r.slug, blurb: r.blurb.trim() }))

    return {
      results,
      insight: typeof parsed.insight === 'string' && parsed.insight.trim() ? parsed.insight.trim() : null,
      persona:
        typeof parsed.persona === 'string' && (SEARCH_PERSONAS as readonly string[]).includes(parsed.persona)
          ? parsed.persona
          : null,
    }
  } catch {
    return null
  }
}
