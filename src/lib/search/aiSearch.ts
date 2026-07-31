import Anthropic from '@anthropic-ai/sdk'
import type { SearchIndexItem } from './index'

/**
 * Claude selection + description stage. Replaces the Gatsby prototype's two
 * OpenAI functions (embeddings ranking + gpt-4.1-nano blurbs) with one call:
 * given the lexical shortlist, Claude picks the relevant projects, writes a
 * caption-grounded blurb for each, labels the fit (direct vs adjacent), and
 * infers the buyer persona.
 *
 * Grounding contract (from the persona study): blurbs may only state facts
 * present in the supplied listing; query vocabulary selects, it never asserts;
 * vision pieces get no client-delivery language; the portfolio's absence of
 * something is never claimed (the model only sees a shortlist). The route
 * additionally enforces this post-hoc via checkBlurbGrounding.
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
  results: { slug: string; blurb: string; fit: 'direct' | 'adjacent'; anchor?: string }[]
  insight: string | null
  persona: string | null
  gapNote: string | null
}

function candidateLines(candidates: SearchIndexItem[]): string {
  return candidates
    .map((c) => {
      const parts = [
        `slug: ${c.slug}`,
        `type: ${c.kind === 'work' ? 'CASE STUDY (delivered client work)' : 'VISION (published concept or research — not a client engagement)'}`,
        `title: ${c.title}`,
        c.client ? `client: ${c.client}` : null,
        c.categories.length ? `categories: ${c.categories.join(', ')}` : null,
        c.caption ? `about: ${c.caption.slice(0, 220)}` : null,
        c.sections?.length
          ? `anchors: ${c.sections.map((s) => `${s.id} ("${s.title.slice(0, 40)}")`).join(' · ')}`
          : null,
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
    'A visitor searched our portfolio. From the candidate projects below, pick the ones that answer their query.',
    '',
    `Visitor query: "${query}"`,
    '',
    'Candidate projects:',
    candidateLines(candidates),
    '',
    'Also infer which buyer persona the query most sounds like, one of:',
    SEARCH_PERSONAS.join(', '),
    'or null if unclear (casual browsers and students are null — do not force-fit).',
    '',
    'Respond with STRICT JSON only, no prose, exactly this shape:',
    '{"results":[{"slug":"...","blurb":"...","fit":"direct","anchor":null}],"insight":"...","persona":"healthcare_executive","gapNote":null}',
    '',
    'GROUNDING RULES — these outrank being persuasive:',
    "- A blurb may state ONLY facts present in that project's listing above (title, client, categories, about). Explaining relevance to the query is welcome; asserting that the project contains features, standards, clients, metrics, compliance, licenses, or deliverables its listing does not mention is forbidden.",
    "- Query vocabulary is for SELECTING projects, never for describing them. Do not echo the visitor's acronyms, regulations, timelines, or metrics back as project facts.",
    '- Never use delivery language (built, shipped, delivered, worked with, launched) about a VISION item — they are published concepts/research, not client engagements. Describe them as what they are.',
    '- Do not write evidence words (documented, proven, measured, validated) unless the listing itself contains that evidence.',
    '- Avoid flattery framing ("exactly what you need", "directly applicable to your…"). Show relevance by describing the work; let the visitor judge the fit.',
    '',
    'FIT AND GAPS:',
    '- fit: "direct" when the project squarely answers the query; "adjacent" when it is honestly nearby (related domain, transferable approach). Prefer returning 1–3 adjacent projects over an empty list when nothing is direct — specialists deserve a bridge, not a shrug.',
    '- When the best you have is adjacent, set gapNote: ONE honest sentence naming the gap and the bridge, e.g. "No infusion-pump work in this set — the closest is our FDA-cleared cardiac monitor UI." Otherwise gapNote: null.',
    "- NEVER state or imply that GoInvo's portfolio lacks something — you see a shortlist, not the portfolio. No \"doesn't appear to include\", no \"does not address\". The gapNote formula \"No X in this set — closest is Y\" is the only allowed gap phrasing.",
    '- Return an empty results array only when nothing above relates at all.',
    '',
    'ANCHOR (deep links): when a candidate lists anchors and ONE of them clearly holds the content that answers the query, set "anchor" to that id — the visitor will land scrolled to that exact section. Use only ids from that candidate\'s own anchors list; when no section clearly fits, use null (landing at the top is better than landing somewhere misleading).',
    '',
    'BLURBS: 1–2 sentences each, most-relevant first, plain language, no "This project…" openers for every item.',
    'INSIGHT: one short sentence describing what the visitor seems to be looking for (their intent — never portfolio commentary). null if the query is too vague.',
    'PERSONA: always include your best guess (or null) even when results is empty.',
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
      results?: { slug?: unknown; blurb?: unknown; fit?: unknown; anchor?: unknown }[]
      insight?: unknown
      persona?: unknown
      gapNote?: unknown
    }

    const validSlugs = new Set(candidates.map((c) => c.slug))
    const results = (Array.isArray(parsed.results) ? parsed.results : [])
      .filter(
        (r): r is { slug: string; blurb: string; fit?: unknown; anchor?: unknown } =>
          typeof r.slug === 'string' &&
          validSlugs.has(r.slug) &&
          typeof r.blurb === 'string' &&
          r.blurb.trim().length > 0,
      )
      .slice(0, 6)
      .map((r) => ({
        slug: r.slug,
        blurb: r.blurb.trim(),
        fit: (r.fit === 'adjacent' ? 'adjacent' : 'direct') as 'direct' | 'adjacent',
        // Validated against the item's real section list in the route.
        anchor: typeof r.anchor === 'string' && r.anchor.trim() ? r.anchor.trim() : undefined,
      }))

    return {
      results,
      insight: typeof parsed.insight === 'string' && parsed.insight.trim() ? parsed.insight.trim() : null,
      persona:
        typeof parsed.persona === 'string' && (SEARCH_PERSONAS as readonly string[]).includes(parsed.persona)
          ? parsed.persona
          : null,
      gapNote: typeof parsed.gapNote === 'string' && parsed.gapNote.trim() ? parsed.gapNote.trim() : null,
    }
  } catch {
    return null
  }
}
