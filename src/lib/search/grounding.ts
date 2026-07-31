import type { SearchIndexItem } from './index'

/**
 * Blurb grounding guard — the post-check behind the persona study's #1 finding.
 *
 * The model's failure signature is asserting the visitor's own vocabulary as
 * project fact ("documented time savings", "aligned with FDA expectations",
 * "Built a centralized database" for a concept piece). The prompt now forbids
 * this; this module is the belt to that suspender: a blurb that trips a rule
 * is replaced by the project's own caption, and the response says so via
 * blurbSource. Deterministic and cheap — no extra model call.
 */

export type BlurbSource = 'ai' | 'caption'

/** Regulatory / legal / evidentiary vocabulary that must be present in the
 * source listing before a blurb may claim it. Grouped for readability. */
const RISKY_PATTERNS: RegExp[] = [
  // regulatory instruments & standards
  /\bFDA\b/i,
  /\bHIPAA\b/i,
  /\bMLR\b/i,
  /\bIEC\s?62366\b/i,
  /\bSection\s?508\b/i,
  /\bWCAG\b/i,
  /\b510\(k\)\b/i,
  /\bregulatory\s+(compliance|scrutiny|submissions?|hurdles?|review)\b/i,
  /\bcomplian(ce|t)\b/i,
  // evidence words (fabricated under "numbers, not vibes" pressure)
  /\bdocumented\b/i,
  /\bproven\b/i,
  /\bvalidated\b/i,
  /\bcertified\b/i,
  /\bmeasur(ed|able)\s+(outcomes?|results?|improvements?|wins?)\b/i,
  // legal / licensing claims
  /\bcreative\s+commons\b/i,
  /\bCC\s?BY\b/,
  /\b(MIT|Apache)\s+licen[cs]e\b/i,
  /\blicens(e|ed|ing)\b/i,
  // adoption/outcome assertions
  /\badopted\s+in\s+the\s+field\b/i,
  /\benterprise\s+adoption\b/i,
]

/** Delivery language that may not be used for vision pieces (published
 * concepts/research — not client engagements). */
const DELIVERY_PATTERNS: RegExp[] = [
  /\bbuilt\b/i,
  /\bshipped?\b/i,
  /\bdeliver(ed|ing)?\b/i,
  /\bdeployed\b/i,
  /\blaunched\b/i,
  /\bimplemented\s+for\b/i,
  /\bworked\s+(directly\s+)?with\b/i,
  /\bpartnered\s+with\b/i,
  /\bcreated\s+for\s+\w/i,
]

function sourceText(item: SearchIndexItem): string {
  return [item.title, item.caption, item.client ?? '', item.categories.join(' '), (item.keywords ?? []).join(' ')]
    .join(' ')
    .toLowerCase()
}

/** ALL-CAPS acronyms (2–6 letters) in a text, e.g. FDA, MLR, CHF, SDOH. */
export function extractAcronyms(text: string): string[] {
  return Array.from(new Set(text.match(/\b[A-Z]{2,6}\b/g) ?? []))
}

export interface GroundingVerdict {
  ok: boolean
  reason?: string
}

/**
 * A blurb passes only if every risky claim it makes is present in the item's
 * own listing, it echoes no query acronym the listing lacks, and (for vision
 * pieces) it uses no client-delivery language.
 */
export function checkBlurbGrounding(
  blurb: string,
  item: SearchIndexItem,
  query: string,
): GroundingVerdict {
  const source = sourceText(item)

  for (const pattern of RISKY_PATTERNS) {
    const match = blurb.match(pattern)
    if (match && !pattern.test(source)) {
      return { ok: false, reason: `unsourced claim: "${match[0]}"` }
    }
  }

  // Acronym echo: an ALL-CAPS term from the query, asserted in the blurb,
  // absent from the listing (the "MLR workflows" / "CHF patients" pattern).
  const queryAcronyms = new Set(extractAcronyms(query).map((a) => a.toLowerCase()))
  for (const acronym of extractAcronyms(blurb)) {
    const lower = acronym.toLowerCase()
    if (queryAcronyms.has(lower) && !source.includes(lower)) {
      return { ok: false, reason: `query acronym echoed as fact: "${acronym}"` }
    }
  }

  if (item.kind === 'vision') {
    for (const pattern of DELIVERY_PATTERNS) {
      const match = blurb.match(pattern)
      if (match) {
        return { ok: false, reason: `delivery language for a vision piece: "${match[0]}"` }
      }
    }
  }

  return { ok: true }
}

/** Returns the blurb to serve and which source it came from. */
export function groundedBlurb(
  blurb: string | undefined,
  item: SearchIndexItem,
  query: string,
): { text: string; source: BlurbSource } {
  if (!blurb || !blurb.trim()) return { text: item.caption, source: 'caption' }
  const verdict = checkBlurbGrounding(blurb, item, query)
  return verdict.ok ? { text: blurb, source: 'ai' } : { text: item.caption, source: 'caption' }
}

/** Environment-scoped cache key: preview/dev cache entries must never serve
 * production (and vice versa) — the persona study caught a cross-env hit. */
export function searchCacheKey(hashedQuery: string): string {
  const env = process.env.VERCEL_ENV || 'dev'
  return `ais:${env}:q:${hashedQuery}`
}
