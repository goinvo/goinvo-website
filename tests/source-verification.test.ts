import { describe, expect, it } from 'vitest'

import {
  buildTextFragmentUrl,
  extractReadableText,
  isPublishable,
  normaliseForComparison,
  quoteAppearsIn,
  resolveVerificationStatus,
  type VerifiedEvidence,
} from '@/lib/marketing/sourceVerification'

const evidence: VerifiedEvidence[] = [
  { url: 'https://example.org/a', title: 'A', quote: 'q', textFragmentUrl: 'https://example.org/a' },
]

describe('extractReadableText', () => {
  it('drops scripts, styles and tags but keeps the prose', () => {
    const html =
      '<html><head><style>.a{color:red}</style><script>var x = "hidden"</script></head>' +
      '<body><p>Moderna announced&nbsp;a partnership.</p></body></html>'
    const text = extractReadableText(html)
    expect(text).toBe('Moderna announced a partnership.')
    expect(text).not.toContain('hidden')
    expect(text).not.toContain('color:red')
  })

  it('decodes the entities that would otherwise break an exact match', () => {
    expect(extractReadableText('<p>AT&amp;T said &quot;yes&quot;</p>')).toBe('AT&T said "yes"')
  })
})

describe('quoteAppearsIn', () => {
  const page = extractReadableText(
    '<p>On March 12, 2026 Crossover Health completed its merger with Premise Health,' +
      ' forming a company serving 400+ organisations.</p>',
  )

  it('accepts a quote that is really there', () => {
    expect(quoteAppearsIn(page, 'Crossover Health completed its merger with Premise Health')).toBe(true)
  })

  it('accepts across curly quotes, dashes and collapsed whitespace', () => {
    // A model transcribes typography loosely; that is not a substantive change.
    const styled = 'On March 12, 2026 Crossover Health completed its merger with Premise Health'
    expect(quoteAppearsIn(page, styled)).toBe(true)
  })

  it('rejects a plausible-sounding quote that is not in the page', () => {
    // The whole point: a fabricated quote must not pass because it reads right.
    expect(quoteAppearsIn(page, 'Crossover Health completed its merger with Amazon Care')).toBe(false)
  })

  it('rejects a paraphrase', () => {
    expect(quoteAppearsIn(page, 'Crossover merged with Premise in March')).toBe(false)
  })

  it('rejects a quote too short to mean anything', () => {
    // "merger" appears, but proves nothing about the claim.
    expect(quoteAppearsIn(page, 'merger')).toBe(false)
    expect(quoteAppearsIn(page, 'Crossover Health')).toBe(false)
  })

  it('is not fooled by an empty document or empty quote', () => {
    expect(quoteAppearsIn('', 'Crossover Health completed its merger with Premise')).toBe(false)
    expect(quoteAppearsIn(page, '')).toBe(false)
  })
})

describe('normaliseForComparison', () => {
  it('folds typography but preserves wording', () => {
    expect(normaliseForComparison('“Don’t  stop”')).toBe('"don\'t stop"')
  })
})

describe('buildTextFragmentUrl', () => {
  it('builds a highlight link for a short quote', () => {
    const url = buildTextFragmentUrl('https://example.org/news', 'completed its merger')
    expect(url).toBe('https://example.org/news#:~:text=completed%20its%20merger')
  })

  it('uses the start,end form for a long quote, which browsers cap', () => {
    const long = Array.from({ length: 20 }, (_, i) => `word${i}`).join(' ')
    const url = buildTextFragmentUrl('https://example.org/news', long)
    expect(url).toContain('#:~:text=')
    expect(url).toContain(',')
    expect(url).toContain('word0')
    expect(url).toContain('word19')
  })

  it('replaces an existing fragment rather than appending a second one', () => {
    expect(buildTextFragmentUrl('https://example.org/a#section', 'completed its merger')).toBe(
      'https://example.org/a#:~:text=completed%20its%20merger',
    )
  })
})

describe('resolveVerificationStatus', () => {
  it('verifies only when a real quote also entails the claim', () => {
    expect(
      resolveVerificationStatus({ fetchedAnySource: true, evidence, entailment: 'supported' }),
    ).toBe('verified')
  })

  it('calls a claim that reaches past its evidence overreach, not verified', () => {
    expect(
      resolveVerificationStatus({ fetchedAnySource: true, evidence, entailment: 'partial' }),
    ).toBe('overreach')
  })

  it('is unsupported when no cited source contained the text', () => {
    expect(
      resolveVerificationStatus({ fetchedAnySource: true, evidence: [], entailment: null }),
    ).toBe('unsupported')
  })

  it('never lets an unreadable source count as a pass', () => {
    // Treating "could not check" as verified is how an unverified claim reaches
    // a call sheet wearing a tick.
    const status = resolveVerificationStatus({
      fetchedAnySource: false,
      evidence,
      entailment: 'supported',
    })
    expect(status).toBe('unchecked')
    expect(isPublishable(status)).toBe(false)
  })

  it('treats only "verified" as publishable', () => {
    expect(isPublishable('verified')).toBe(true)
    for (const status of ['overreach', 'unsupported', 'unchecked'] as const) {
      expect(isPublishable(status)).toBe(false)
    }
  })
})
