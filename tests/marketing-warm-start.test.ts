import { describe, expect, it } from 'vitest'

import { buildWarmStartSuggestions } from '@/lib/marketing'

describe('buildWarmStartSuggestions', () => {
  it('turns case-study clients into org-level entries with the case study as how-we-know', () => {
    const out = buildWarmStartSuggestions({
      caseStudyClients: [{ client: 'IPSOS', title: 'Ipsos Facto' }],
    })
    expect(out).toEqual([
      {
        name: 'IPSOS',
        organization: 'IPSOS',
        howWeKnow: 'Past client — “Ipsos Facto”',
        kind: 'client-org',
      },
    ])
  })

  it('merges the same client across case studies (case-insensitive) and sorts orgs alphabetically', () => {
    const out = buildWarmStartSuggestions({
      caseStudyClients: [
        { client: 'Mount Sinai Hospital', title: 'Genetic Heroes' },
        { client: '3M', title: 'CodeRyte NLP' },
        { client: 'mount sinai hospital', title: 'Consent Redesign' },
      ],
    })
    expect(out.map((s) => s.name)).toEqual(['3M', 'Mount Sinai Hospital'])
    expect(out[1].howWeKnow).toBe('Past client — “Genetic Heroes”, “Consent Redesign”')
  })

  it('dedupes repeated titles for the same client (a published doc + its open draft)', () => {
    const out = buildWarmStartSuggestions({
      caseStudyClients: [
        { client: 'IPSOS', title: 'Ipsos Facto' },
        { client: 'IPSOS', title: 'Ipsos Facto' },
      ],
    })
    expect(out[0].howWeKnow).toBe('Past client — “Ipsos Facto”')
  })

  it('drops self-references and junk org labels', () => {
    const out = buildWarmStartSuggestions({
      caseStudyClients: [
        { client: 'GoInvo', title: 'Own thing' },
        { client: 'GoInvo Studio', title: 'Own thing 2' },
        { client: 'Feature', title: 'Placeholder' },
        { client: '3M', title: 'Real' },
      ],
    })
    expect(out.map((s) => s.name)).toEqual(['3M'])
  })

  it('splits thanked people one per line, skipping prose-looking lines, and lists people before orgs', () => {
    const out = buildWarmStartSuggestions({
      caseStudyClients: [{ client: '3M', title: 'Real' }],
      thankedPeople: [
        {
          text: 'Peter Jones\nDanny van Leeuwen\n\nSpecial thanks to everyone who reviewed drafts: too many to name.\n',
          featureTitle: 'Determinants of Health',
        },
      ],
    })
    expect(out.map((s) => `${s.kind}:${s.name}`)).toEqual([
      'thanked-person:Peter Jones',
      'thanked-person:Danny van Leeuwen',
      'client-org:3M',
    ])
    expect(out[0].howWeKnow).toBe('Thanked on “Determinants of Health”')
    expect(out[0].organization).toBeUndefined()
  })

  it('drops a thanked person who already exists as a contact EVEN when that contact has an organization', () => {
    // The regression the review caught: intake-parsed contacts usually carry an
    // organization, so a name+org key would never match the org-less suggestion.
    const out = buildWarmStartSuggestions({
      thankedPeople: [{ text: 'Danny van Leeuwen\nJane Roe', featureTitle: 'A' }],
      existingContacts: [{ name: 'Danny van Leeuwen', organization: 'Health Hats' }],
    })
    expect(out.map((s) => s.name)).toEqual(['Jane Roe'])
  })

  it('drops a client org once ANY existing contact belongs to that org (named person at the account)', () => {
    const out = buildWarmStartSuggestions({
      caseStudyClients: [
        { client: '3M', title: 'Real' },
        { client: 'AHRQ', title: 'Guides' },
      ],
      existingContacts: [{ name: 'Jane Doe', organization: '3M' }],
    })
    expect(out.map((s) => s.name)).toEqual(['AHRQ'])
  })

  it('drops a client org that exists as an org-level contact (name = org, from a prior warm-start add)', () => {
    const out = buildWarmStartSuggestions({
      caseStudyClients: [{ client: '3M', title: 'Real' }],
      existingContacts: [{ name: '3M', organization: '3M' }],
    })
    expect(out).toEqual([])
  })

  it('dedupes repeated thanked people across features', () => {
    const out = buildWarmStartSuggestions({
      thankedPeople: [
        { text: 'Jane Roe', featureTitle: 'A' },
        { text: 'Jane Roe', featureTitle: 'B' },
      ],
    })
    expect(out.map((s) => s.name)).toEqual(['Jane Roe'])
  })

  it('handles empty/missing input without throwing', () => {
    expect(buildWarmStartSuggestions({})).toEqual([])
    expect(
      buildWarmStartSuggestions({
        caseStudyClients: [{ client: null, title: null }],
        thankedPeople: [{ text: null, featureTitle: null }],
        existingContacts: [{ name: null, organization: null }],
      }),
    ).toEqual([])
  })
})
