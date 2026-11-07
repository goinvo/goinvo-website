import { describe, expect, it, afterEach } from 'vitest'
import { tokenize, expandTokens, scoreItem, recall } from '@/lib/search/lexical'
import { checkBlurbGrounding, groundedBlurb, searchCacheKey, extractAcronyms } from '@/lib/search/grounding'
import { normalizeSections, resolveAnchor, type SearchIndexItem } from '@/lib/search/index'
import { headingAnchorId } from '@/lib/headingAnchor'

/**
 * Guards for the persona-study fixes: acronym-aware recall (SDOH/ePRO class),
 * the blurb grounding post-check (unsourced regulatory/evidence/license claims,
 * delivery language for vision pieces, query-acronym echo), and env-scoped
 * cache keys. Every case traces to a documented persona finding.
 */

function item(overrides: Partial<SearchIndexItem>): SearchIndexItem {
  return {
    slug: 'test-item',
    href: '/work/test-item',
    title: 'Test Item',
    caption: 'A test caption.',
    categories: [],
    kind: 'work',
    ...overrides,
  }
}

const determinants = item({
  slug: 'determinants-of-health',
  title: 'Determinants of Health',
  caption: '89% of health occurs outside of the clinical space. These factors are known as the social determinants of health.',
  kind: 'vision',
  keywords: ['sdoh', 'social determinants', 'open source', 'poster'],
})

const openPro = item({
  slug: 'open-pro',
  title: 'openPRO',
  caption: 'An open source framework for patient-reported outcomes.',
  kind: 'vision',
  keywords: ['epro', 'pro', 'patient-reported outcomes', 'open source', 'clinical research'],
})

const infobionic = item({
  slug: 'infobionic-heart-monitoring',
  title: 'Visualizing Real-Time Cardiac Arrhythmias',
  caption: 'Mobile health design for real-time cardiac arrhythmias.',
  client: 'InfoBionic',
  keywords: ['medical device', 'fda', 'fda-cleared', 'class ii', '510(k)', 'remote monitoring', 'cardiac', 'arrhythmia', 'regulated device'],
})

describe('lexical expansion (SDOH/ePRO recall gap)', () => {
  it('expands SDOH into corpus phrasings', () => {
    const { phrases } = expandTokens(tokenize('SDOH data collection'))
    expect(phrases).toContain('social determinants')
  })

  it('recalls Determinants of Health for the acronym query that failed in the study', () => {
    const results = recall('open source SDOH visualization', [determinants, openPro], 10)
    expect(results.map((r) => r.item.slug)).toContain('determinants-of-health')
  })

  it('recalls openPRO for the ePRO query that failed in the study', () => {
    const results = recall('ePRO instrument design', [determinants, openPro], 10)
    expect(results.map((r) => r.item.slug)).toContain('open-pro')
  })

  it('recalls the FDA-cleared device work for med-device vocabulary', () => {
    const results = recall('FDA-cleared medical device interface', [infobionic, determinants], 10)
    expect(results[0]?.item.slug).toBe('infobionic-heart-monitoring')
  })

  it('still returns nothing for nonsense (never pads)', () => {
    expect(recall('qwzx blorf 123', [determinants, openPro, infobionic], 10)).toHaveLength(0)
  })

  it('scores keyword hits like categories', () => {
    expect(scoreItem(tokenize('medicaid eligibility'), item({ keywords: ['medicaid', 'eligibility'] }))).toBeGreaterThan(0)
  })
})

describe('blurb grounding guard', () => {
  it('rejects unsourced regulatory claims ("aligned with FDA expectations")', () => {
    const target = item({ caption: 'A framework for certifying the design quality of AI-powered health products.' })
    const verdict = checkBlurbGrounding('A certification framework aligned with FDA expectations.', target, 'FDA human factors')
    expect(verdict.ok).toBe(false)
  })

  it('allows FDA language when the listing itself carries it (via keywords)', () => {
    const verdict = checkBlurbGrounding(
      'The clinical UI of an FDA-cleared remote cardiac monitor.',
      infobionic,
      'FDA device experience',
    )
    expect(verdict.ok).toBe(true)
  })

  it('rejects fabricated evidence words under evidentiary pressure ("documented")', () => {
    const target = item({ caption: 'Software design for efficient, more intelligent protocol review.' })
    const verdict = checkBlurbGrounding(
      'A redesigned workflow with documented time and burden reduction.',
      target,
      'measurable throughput wins, numbers not vibes',
    )
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toMatch(/documented/i)
  })

  it('rejects fabricated license claims (Creative Commons)', () => {
    const target = item({ caption: 'Open source designs, and assets to educate patients on health data.' })
    const verdict = checkBlurbGrounding(
      'Creative Commons licensed assets, freely available for download and reuse.',
      target,
      'Creative Commons licensed health data visualization assets',
    )
    expect(verdict.ok).toBe(false)
  })

  it('rejects delivery language for vision pieces (concept-as-past-performance)', () => {
    const target = item({
      kind: 'vision',
      caption: 'A centralized MA resident database for better service accessibility.',
    })
    const verdict = checkBlurbGrounding(
      'Built a centralized Massachusetts resident database for state agencies.',
      target,
      'past performance with state government agencies',
    )
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toMatch(/delivery language/i)
  })

  it('allows delivery language for delivered client work', () => {
    const verdict = checkBlurbGrounding(
      'Designed and delivered the mobile UI for real-time cardiac monitoring.',
      infobionic,
      'remote patient monitoring design',
    )
    expect(verdict.ok).toBe(true)
  })

  it('rejects query acronyms echoed as project fact (the MLR/CHF pattern)', () => {
    const target = item({ caption: 'Software design for efficient, more intelligent protocol review.' })
    const verdict = checkBlurbGrounding(
      'Directly applicable to MLR workflows in pharma medical affairs.',
      target,
      'GenAI literature review that survives MLR review',
    )
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toMatch(/MLR/)
  })

  it('keeps benign query tailoring (the student class-presentation case)', () => {
    const target = item({ caption: 'Open source designs, and assets to educate patients on health data.' })
    const verdict = checkBlurbGrounding(
      'Open source educational designs and assets — useful visuals for a class presentation.',
      target,
      'cool health data viz for my class presentation',
    )
    expect(verdict.ok).toBe(true)
  })

  it('groundedBlurb falls back to the caption and says so', () => {
    const target = item({ caption: 'The honest caption.' })
    const result = groundedBlurb('A proven, validated success.', target, 'proven results')
    expect(result.text).toBe('The honest caption.')
    expect(result.source).toBe('caption')
  })

  it('extractAcronyms finds field abbreviations', () => {
    expect(extractAcronyms('FDA human factors and MLR review for CHF')).toEqual(
      expect.arrayContaining(['FDA', 'MLR', 'CHF']),
    )
  })
})

describe('cache key environment scoping', () => {
  const original = process.env.VERCEL_ENV
  afterEach(() => {
    if (original === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = original
  })

  it('prefixes keys with the deploy environment', () => {
    process.env.VERCEL_ENV = 'preview'
    expect(searchCacheKey('abc123')).toBe('ais:preview:q2:abc123')
    process.env.VERCEL_ENV = 'production'
    expect(searchCacheKey('abc123')).toBe('ais:production:q2:abc123')
  })

  it('defaults to dev when unset', () => {
    delete process.env.VERCEL_ENV
    expect(searchCacheKey('abc123')).toBe('ais:dev:q2:abc123')
  })
})

describe('section anchors (deep links that auto-scroll)', () => {
  it('headingAnchorId matches the renderer formula', () => {
    // Must equal text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    // — the ids PortableTextRenderer stamps on headings.
    expect(headingAnchorId('When Guidelines Disagree')).toBe('when-guidelines-disagree')
    expect(headingAnchorId('  89% of Health: Outside the Clinic!  ')).toBe('89-of-health-outside-the-clinic')
    expect(headingAnchorId('---')).toBe('')
  })

  it('normalizeSections slugs, dedupes, and caps headings', () => {
    const sections = normalizeSections([
      { text: 'The Problem' },
      { text: 'The  Problem ' }, // duplicate after whitespace normalization
      { text: '' },
      { text: 'Design Process' },
    ])
    expect(sections).toEqual([
      { id: 'the-problem', title: 'The Problem' },
      { id: 'design-process', title: 'Design Process' },
    ])
    const many = normalizeSections(Array.from({ length: 20 }, (_, i) => ({ text: `Section ${i}` })))
    expect(many.length).toBe(12)
  })

  it('resolveAnchor only accepts anchors that exist on the page', () => {
    const target = item({ sections: [{ id: 'the-problem', title: 'The Problem' }] })
    expect(resolveAnchor(target, 'the-problem')).toEqual({ id: 'the-problem', title: 'The Problem' })
    expect(resolveAnchor(target, 'hallucinated-section')).toBeNull()
    expect(resolveAnchor(target, undefined)).toBeNull()
    expect(resolveAnchor(item({}), 'the-problem')).toBeNull()
  })
})
