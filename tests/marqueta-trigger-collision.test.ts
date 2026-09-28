/**
 * Two Marqueta features want the same words, so this file exists to prove they
 * never both get them.
 *
 * Call prep (1.3's Slack work) owns the bare verbs: `outline …`, `script …`,
 * `draft an email to <person>`. Generation owns `draft <format>: <topic>`. They
 * overlap on "outline", "script" and "email", and whichever check runs first
 * silently wins — so the loser does not fail loudly, it just becomes
 * unreachable. Dead code that looks shipped is the exact failure this repo's
 * rules tell us to refuse, so the split is pinned here rather than trusted.
 *
 * Two directions, both required:
 *   1. every generation trigger reaches `generate`, and nothing else does;
 *   2. every prep trigger still reaches prep, unchanged by generation existing.
 *
 * And one liveness check: every format the generator advertises must be
 * reachable. A format nobody can trigger is an inert path.
 */
import { describe, expect, it } from 'vitest'

import { parseMarquetaIntent } from '@/lib/marketing/marquetaChat'
import {
  detectGenerationRequest,
  GENERATION_FORMATS,
  GENERATION_TRIGGER_EXAMPLES,
  type GenerationFormat,
} from '@/lib/marketing/marquetaGenerate'

/** The phrases that must reach generation, one per advertised format. */
const GENERATION_TRIGGERS: { text: string; format: GenerationFormat }[] = [
  { text: 'draft outline: remote cardiac trials', format: 'outline' },
  { text: 'draft script: why sponsors stall', format: 'script' },
  { text: 'draft post: open-source health data', format: 'post' },
  { text: 'draft email: the AIwithCare spinout', format: 'email' },
  // The same, with the articles and longer format phrases people actually type.
  { text: 'draft a blog outline: determinants of health', format: 'outline' },
  { text: 'draft a video script: the Heard case study', format: 'script' },
  { text: 'draft a LinkedIn post: our new poster series', format: 'post' },
  { text: 'can you draft an outreach email: Mass General Brigham', format: 'email' },
]

/**
 * The phrases call prep owns. Each is a near-miss of a generation trigger — the
 * same verb or the same format word — and each must still be prep's.
 */
const PREP_TRIGGERS: string[] = [
  'outline the Q4 story',
  'outline Jane Doe at MGB',
  'script for the Heard call',
  'draft an email to Jane at MGB',
  'write me a note for Acme',
  'draft a script about the AIwithCare spinout',
  'write an intro email to Mass General Brigham',
]

describe('Marqueta trigger words: generation and call prep never both claim a phrase', () => {
  it('sends every generation trigger to generate, with the right format', () => {
    for (const { text, format } of GENERATION_TRIGGERS) {
      const intent = parseMarquetaIntent(text)
      expect(intent.kind, `"${text}" should reach generation`).toBe('generate')
      if (intent.kind === 'generate') {
        expect(intent.format, `"${text}" should be ${format}`).toBe(format)
        expect(intent.topic.length, `"${text}" should carry a topic`).toBeGreaterThan(0)
      }
    }
  })

  it('leaves every call-prep trigger with prep, so generation stole nothing', () => {
    for (const text of PREP_TRIGGERS) {
      const intent = parseMarquetaIntent(text)
      expect(intent.kind, `"${text}" belongs to call prep`).not.toBe('generate')
      expect(detectGenerationRequest(text), `"${text}" must not look like generation`).toBeNull()
    }
  })

  it('reaches every format the generator advertises, so no path is inert', () => {
    const reached = new Set(
      GENERATION_TRIGGERS.map(({ text }) => detectGenerationRequest(text)?.format).filter(
        (format): format is GenerationFormat => Boolean(format),
      ),
    )
    for (const format of GENERATION_FORMATS) {
      expect(reached.has(format), `no phrase reaches the "${format}" format`).toBe(true)
    }
  })

  it('advertises exactly the grammar it accepts, so the help text cannot drift', () => {
    expect(GENERATION_TRIGGER_EXAMPLES).toHaveLength(GENERATION_FORMATS.length)
    for (const example of GENERATION_TRIGGER_EXAMPLES) {
      // Every advertised example must itself parse, with its placeholder filled.
      const real = example.replace('<topic>', 'clinical AI pre-mortems')
      const intent = parseMarquetaIntent(real)
      expect(intent.kind, `advertised "${example}" does not parse`).toBe('generate')
    }
  })

  it('needs the colon, in both directions', () => {
    // Drop the colon from a generation trigger and it stops being generation.
    for (const { text } of GENERATION_TRIGGERS) {
      const withoutColon = text.replace(':', '')
      expect(
        detectGenerationRequest(withoutColon),
        `"${withoutColon}" has no colon, so it is not generation`,
      ).toBeNull()
    }
    // Add a colon to a prep trigger that has no "draft" verb and it is still prep's.
    expect(detectGenerationRequest('outline: the Q4 story')).toBeNull()
  })
})
