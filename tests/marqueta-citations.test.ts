import { describe, expect, it } from 'vitest'

import {
  buildResearchCitations,
  citationsForPrompt,
  escapeSlackText,
  formatCitationForSlack,
  toResearchCitation,
  type ResearchRecordInput,
} from '@/lib/marketing/marquetaCitations'

const VERIFIED: ResearchRecordInput = {
  organization: 'Mass General Brigham',
  recentSignal: 'spun out an AI venture focused on clinical documentation',
  reachableAbout: 'how the venture handles clinician trust in AI output',
  quoteUrl: 'https://example.org/news/aiwithcare',
  suggestedOfferKey: 'premortem',
  confidence: 'high',
  context: 'Reportedly raised a large round, though the figure was not on the page.',
  sources: [{ title: 'MGB spins out AIwithCare', url: 'https://example.org/news/aiwithcare' }],
  verification: {
    status: 'verified',
    evidence: [
      {
        url: 'https://example.org/news/aiwithcare',
        quote: 'Mass General Brigham today announced the launch of AIwithCare, a new venture.',
        textFragmentUrl: 'https://example.org/news/aiwithcare#:~:text=Mass%20General%20Brigham,new%20venture.',
      },
    ],
  },
}

const UNVERIFIED: ResearchRecordInput = {
  organization: 'Cherish',
  recentSignal: 'is expanding its remote-monitoring pilots',
  reachableAbout: 'measuring adherence in remote monitoring',
  quote: 'Cherish is scaling to thousands of homes this year.',
  quoteUrl: 'https://example.com/cherish',
  verification: { status: 'unchecked', evidence: [] },
}

describe('toResearchCitation', () => {
  it('passes the verified quote through verbatim and prefers the deep link', () => {
    const citation = toResearchCitation(VERIFIED)!
    expect(citation.verified).toBe(true)
    // The actual content, unchanged — not a paraphrase.
    expect(citation.quote).toBe(
      'Mass General Brigham today announced the launch of AIwithCare, a new venture.',
    )
    // The href points at the exact sentence, not the top of the page.
    expect(citation.sourceUrl).toContain('#:~:text=')
  })

  it('never surfaces an unverified quote as if it were proven', () => {
    const citation = toResearchCitation(UNVERIFIED)!
    expect(citation.verified).toBe(false)
    // The model's claimed quote is dropped — it was never confirmed to exist.
    expect(citation.quote).toBe('')
    expect(citation.sourceUrl).toBe('https://example.com/cherish')
  })

  it('drops a record with nothing citable', () => {
    expect(toResearchCitation({ organization: 'X' })).toBeNull()
    expect(toResearchCitation({ organization: '', recentSignal: 'something' })).toBeNull()
  })
})

describe('buildResearchCitations', () => {
  it('shows verified only by default, and ranks verified first when asked for both', () => {
    const verifiedOnly = buildResearchCitations([UNVERIFIED, VERIFIED])
    expect(verifiedOnly).toHaveLength(1)
    expect(verifiedOnly[0].organization).toBe('Mass General Brigham')

    const both = buildResearchCitations([UNVERIFIED, VERIFIED], { includeUnverified: true })
    expect(both.map((c) => c.verified)).toEqual([true, false])
  })
})

describe('formatCitationForSlack', () => {
  it('quotes the passage and links to it in context', () => {
    const rendered = formatCitationForSlack(toResearchCitation(VERIFIED)!)
    expect(rendered).toContain('> Mass General Brigham today announced')
    expect(rendered).toContain('|Read it in context>')
    expect(rendered).toContain('#:~:text=')
  })

  it('marks an unverified lead as not-a-fact', () => {
    const rendered = formatCitationForSlack(toResearchCitation(UNVERIFIED)!)
    expect(rendered).toMatch(/do not repeat as fact/i)
    // No blockquote line: an unverified lead never wears quotation marks.
    expect(rendered).not.toMatch(/^> /m)
  })
})

describe('citationsForPrompt', () => {
  it('hands the generator only verified quotes, with the URL to cite', () => {
    const prompt = citationsForPrompt(
      buildResearchCitations([UNVERIFIED, VERIFIED], { includeUnverified: true }),
    )
    expect(prompt).toHaveLength(1)
    expect(prompt[0]).toMatchObject({
      organization: 'Mass General Brigham',
      url: expect.stringContaining('#:~:text='),
    })
    expect(prompt[0].quote).toContain('announced the launch of AIwithCare')
  })
})

describe('escapeSlackText', () => {
  it('neutralises Slack control characters in body text', () => {
    expect(escapeSlackText('Cost < $5 & rising > baseline')).toBe(
      'Cost &lt; $5 &amp; rising &gt; baseline',
    )
  })
})
