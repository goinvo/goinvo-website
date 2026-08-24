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
    expect(ORG_RESEARCH_SYSTEM).toMatch(/[Nn]ever invent statistics/)
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
        suggestedOfferKey: 'premortem',
        confidence: 'high',
      },
      sources,
    })
    expect(research.confidence).toBe('high')
    expect(isUsableOrgResearch(research)).toBe(true)
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
