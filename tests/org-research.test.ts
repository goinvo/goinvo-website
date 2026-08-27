import { describe, expect, it } from 'vitest'

import {
  buildOrgResearchPrompt,
  isUsableOrgResearch,
  normaliseOrgResearch,
  orgResearchDocId,
  ORG_RESEARCH_SYSTEM,
} from '@/lib/marketing/orgResearch'

describe('orgResearchDocId', () => {
  it('is deterministic and safe as a Sanity id', () => {
    expect(orgResearchDocId('Mass General Brigham')).toBe('marketingOrgResearch.mass-general-brigham')
    expect(orgResearchDocId('Mass General Brigham')).toBe(orgResearchDocId('Mass  General   Brigham'))
  })

  it('strips punctuation that would fork a record', () => {
    // "Medidata (a Dassault Systemes brand)" and "Medidata" must not collide
    // into different ids on a re-run because of stray characters.
    expect(orgResearchDocId('CCH Healthcare, Inc.')).toBe('marketingOrgResearch.cch-healthcare-inc')
    expect(orgResearchDocId('AbbVie')).toBe('marketingOrgResearch.abbvie')
  })

  it('keeps the id free of a leading or trailing separator', () => {
    expect(orgResearchDocId('  ...Acme...  ')).toBe('marketingOrgResearch.acme')
  })
})

describe('buildOrgResearchPrompt', () => {
  it('names the organisation and lists the offer keys the model may choose from', () => {
    const prompt = buildOrgResearchPrompt({
      organization: 'MEDITECH',
      segment: 'healthtech',
      contactCount: 7,
      offers: [{ key: 'premortem', title: 'AI Pilot Pre-Mortem', oneLiner: 'De-risk a stalled pilot' }],
    })
    expect(prompt).toContain('MEDITECH')
    expect(prompt).toContain('premortem')
    expect(prompt).toContain('7 newsletter subscriber')
  })

  it('says so plainly when there are no offers rather than emitting an empty list', () => {
    const prompt = buildOrgResearchPrompt({ organization: 'Acme', offers: [] })
    expect(prompt).toContain('(none on file)')
  })

  it('instructs the model to admit when it found nothing', () => {
    expect(ORG_RESEARCH_SYSTEM).toMatch(/confidence "low"/)
    // Superseded "never invent statistics" with a stricter rule: a number may
    // not appear in the claim at all unless the quote contains it.
    expect(ORG_RESEARCH_SYSTEM).toMatch(/unless it is in the quote/)
  })
})

describe('ORG_RESEARCH_SYSTEM epistemic rules', () => {
  // The first twenty claims written under the old prompt all failed
  // verification as over-specified. These rules are the fix, so they are pinned.
  it('forbids asserting anything the quote does not contain', () => {
    expect(ORG_RESEARCH_SYSTEM).toMatch(/No date in the claim unless that date is in the quote/)
    expect(ORG_RESEARCH_SYSTEM).toMatch(/No number, headcount, dollar figure or percentage/)
    expect(ORG_RESEARCH_SYSTEM).toMatch(/No person's name, product name or partner name/)
  })

  it('tells the model an empty answer is acceptable', () => {
    expect(ORG_RESEARCH_SYSTEM).toMatch(/empty recentSignal/)
    expect(ORG_RESEARCH_SYSTEM).toMatch(/better than a confident guess/)
  })

  it('routes unprovable richness to context rather than the claim', () => {
    expect(ORG_RESEARCH_SYSTEM).toMatch(/goes in "context"/)
  })
})

describe('normaliseOrgResearch', () => {
  const sources = [{ title: 'Press release', url: 'https://example.org/news' }]

  it('keeps a cited, specific answer at its stated confidence', () => {
    const research = normaliseOrgResearch({
      organization: 'MEDITECH',
      parsed: {
        whatTheyDo: 'EHR vendor',
        recentSignal: 'Launched Expanse Navigator in March 2026',
        reachableAbout: 'How Navigator handles clinician handoffs',
        quote: 'MEDITECH today announced Expanse Navigator',
        quoteUrl: 'https://example.org/news',
        context: 'Wider unverified reading of their roadmap',
        suggestedOfferKey: 'premortem',
        confidence: 'high',
      },
      sources,
    })
    expect(research.confidence).toBe('high')
    expect(research.quote).toBe('MEDITECH today announced Expanse Navigator')
    expect(research.context).toBe('Wider unverified reading of their roadmap')
    expect(isUsableOrgResearch(research)).toBe(true)
  })

  it('is not usable without the quote the claim rests on', () => {
    // Nothing for the verifier to check means nothing to trust.
    const research = normaliseOrgResearch({
      organization: 'MEDITECH',
      parsed: { recentSignal: 'Announced a thing', reachableAbout: 'the thing', confidence: 'high' },
      sources,
    })
    expect(research.quote).toBe('')
    expect(isUsableOrgResearch(research)).toBe(false)
  })

  it('clamps confidence to low when nothing was cited', () => {
    // The model will happily sound certain about a signal it did not find. An
    // uncited claim on a call sheet is the failure this exists to prevent.
    const research = normaliseOrgResearch({
      organization: 'MEDITECH',
      parsed: { recentSignal: 'Big new AI push', reachableAbout: 'their AI push', confidence: 'high' },
      sources: [],
    })
    expect(research.confidence).toBe('low')
    expect(isUsableOrgResearch(research)).toBe(false)
  })

  it('clamps confidence to low when no signal was found, even with sources', () => {
    const research = normaliseOrgResearch({
      organization: 'Acme',
      parsed: { whatTheyDo: 'A company', recentSignal: '', confidence: 'medium' },
      sources,
    })
    expect(research.confidence).toBe('low')
  })

  it('survives an unparseable reply instead of throwing', () => {
    const research = normaliseOrgResearch({ organization: 'Acme', parsed: null, sources: [] })
    expect(research).toMatchObject({ organization: 'Acme', whatTheyDo: '', confidence: 'low' })
    expect(isUsableOrgResearch(research)).toBe(false)
  })

  it('rejects an invalid confidence value rather than storing it', () => {
    const research = normaliseOrgResearch({
      organization: 'Acme',
      parsed: { recentSignal: 'x', reachableAbout: 'y', confidence: 'extremely sure' },
      sources,
    })
    expect(research.confidence).toBe('low')
  })

  it('drops sources with no url and caps the list', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ title: `s${i}`, url: `https://e.org/${i}` }))
    const research = normaliseOrgResearch({
      organization: 'Acme',
      parsed: { recentSignal: 'x', reachableAbout: 'y', confidence: 'high' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sources: [...many, { title: 'broken', url: '' } as any],
    })
    expect(research.sources).toHaveLength(6)
    expect(research.sources.every((source) => source.url)).toBe(true)
  })
})
