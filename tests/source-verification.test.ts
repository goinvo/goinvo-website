import { describe, expect, it } from 'vitest'

import {
  buildTextFragmentUrl,
  extractReadableText,
  findUncitedSpecifics,
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
      resolveVerificationStatus({ sourcesTried: 2, sourcesReadable: 2, evidence, entailment: 'supported' }),
    ).toBe('verified')
  })

  it('calls a claim that reaches past its evidence overreach, not verified', () => {
    expect(
      resolveVerificationStatus({ sourcesTried: 2, sourcesReadable: 2, evidence, entailment: 'partial' }),
    ).toBe('overreach')
  })

  it('is unsupported when no cited source contained the text', () => {
    expect(
      resolveVerificationStatus({ sourcesTried: 2, sourcesReadable: 2, evidence: [], entailment: null }),
    ).toBe('unsupported')
  })

  it('never lets an unreadable source count as a pass', () => {
    // Treating "could not check" as verified is how an unverified claim reaches
    // a call sheet wearing a tick.
    const status = resolveVerificationStatus({
      sourcesTried: 2,
      sourcesReadable: 0,
      evidence,
      entailment: 'supported',
    })
    expect(status).toBe('unchecked')
    expect(isPublishable(status)).toBe(false)
  })

  it('says "could not check" when most sources were unreadable and none supported', () => {
    // Paywalls and bot blocks are common. Reporting a fetch failure as a failed
    // claim would blame the research for the network.
    expect(
      resolveVerificationStatus({
        sourcesTried: 4,
        sourcesReadable: 1,
        evidence: [],
        entailment: null,
      }),
    ).toBe('unchecked')
  })

  it('still says unsupported when we did read most of the sources', () => {
    expect(
      resolveVerificationStatus({
        sourcesTried: 4,
        sourcesReadable: 3,
        evidence: [],
        entailment: null,
      }),
    ).toBe('unsupported')
  })

  it('treats only "verified" as publishable', () => {
    expect(isPublishable('verified')).toBe(true)
    for (const status of ['overreach', 'unsupported', 'unchecked'] as const) {
      expect(isPublishable(status)).toBe(false)
    }
  })
})

describe('extractReadableText entity decoding', () => {
  it('decodes NUMERIC entities, which is what actually broke matching', () => {
    // An SEC filing writes a non-breaking space as &#160;. Leaving it literal
    // broke every quote from that filing ~40 characters in, and looked exactly
    // like the model fabricating quotes.
    expect(extractReadableText('<p>Washington, D.C.&#160;20549</p>')).toBe('Washington, D.C. 20549')
    expect(extractReadableText('<p>March 20, 2025 &#8212; Alnylam</p>')).toBe('March 20, 2025 — Alnylam')
    expect(extractReadableText('<p>it&#x2019;s here</p>')).toBe('it’s here')
  })

  it('decodes the named entities that appear in press releases', () => {
    expect(extractReadableText('<p>CHARLOTTE &mdash; Advocate&rsquo;s pilot&hellip;</p>')).toBe(
      'CHARLOTTE — Advocate’s pilot…',
    )
  })

  it('lets a real filing quote match once entities are decoded', () => {
    const page = extractReadableText('<p>Washington, D.C.&#160;20549 On March 20, 2025, Alnylam issued a press release.</p>')
    expect(quoteAppearsIn(page, 'On March 20, 2025, Alnylam issued a press release.')).toBe(true)
  })
})

describe('findUncitedSpecifics', () => {
  it('finds a number the quote never states', () => {
    expect(
      findUncitedSpecifics('Available to 4,000 physicians across 21 hospitals', 'available to physicians'),
    ).toEqual(expect.arrayContaining(['4,000', '21']))
  })

  it('accepts a number the quote does state, in either notation', () => {
    expect(findUncitedSpecifics('raising $116 million', 'raising $116 million in Series E')).toEqual([])
    expect(findUncitedSpecifics('raising $116 million', 'raising 116 million in Series E')).toEqual([])
  })

  it('flags a month the quote does not give', () => {
    expect(findUncitedSpecifics('On March 20, 2025 they announced', 'they announced a result')).toContain(
      'March',
    )
  })

  it('flags a multi-word name the quote does not contain', () => {
    expect(
      findUncitedSpecifics('acquired Homeward Health in an all-stock deal', 'acquired a company'),
    ).toContain('Homeward Health')
  })

  it('does not flag names and numbers the quote does contain', () => {
    expect(
      findUncitedSpecifics(
        'Cityblock Health entered an agreement to acquire Homeward Health',
        'Cityblock Health has entered into a definitive agreement to acquire Homeward Health',
      ),
    ).toEqual([])
  })

  it('ignores single capitalised words, which are too noisy to mean anything', () => {
    // "Following" at a sentence start is not a proper noun.
    expect(findUncitedSpecifics('Following a pilot they expanded', 'they expanded')).toEqual([])
  })
})

describe('findUncitedSpecifics false positives', () => {
  it('ignores trailing punctuation on a name', () => {
    expect(
      findUncitedSpecifics('trial for Alcohol Use Disorder.', 'trial in individuals with Alcohol Use Disorder (AUD)'),
    ).toEqual([])
  })

  it('peels a sentence-initial word off a name', () => {
    // "On December" and "The FDA" are not organisations.
    expect(findUncitedSpecifics('On December 20 Commure acquired it', 'December 20 Commure acquired it')).toEqual([])
    expect(findUncitedSpecifics('The FDA cleared it', 'FDA cleared it')).toEqual([])
  })

  it('does not flag an organisation for being absent from its own first-person quote', () => {
    expect(
      findUncitedSpecifics('CCH Healthcare states it has 38 locations', 'We have 38 locations and are still growing!', {
        ignore: ['CCH Healthcare'],
      }),
    ).toEqual([])
  })

  it('still flags a genuinely absent name', () => {
    expect(
      findUncitedSpecifics('acquired Homeward Health', 'acquired a company', { ignore: ['Cityblock'] }),
    ).toContain('Homeward Health')
  })
})

describe('findUncitedSpecifics ignore matching', () => {
  it('treats "Pearlhealth" and "Pearl Health" as the same organisation', () => {
    // The stored organisation name is squashed; the claim writes it properly.
    // A space must not make one look like a different company.
    expect(
      findUncitedSpecifics('Pearl Health says new capital will fund expansion', 'The company says the new capital will fund expansion', {
        ignore: ['Pearlhealth'],
      }),
    ).toEqual([])
  })
})
